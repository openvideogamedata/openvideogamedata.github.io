using community.Dtos;
using Microsoft.EntityFrameworkCore;
using community.Utils;
using System.Text.RegularExpressions;

namespace community.Data;

public class GameListRequestService
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    public GameListRequestService(IDbContextFactory<ApplicationDbContext> factory)
    {
        this._factory = factory;
    }

    public async Task<ResponseToPage> ValidateSourceUrl(string url)
    {
        url = url.Trim();

        var (isValid, uri) = IsValidURL(url);
        if (!isValid)
            return new ResponseToPage(false, "Provided url is not valid");

        var hostUrl = uri.Host;
        if (NsfwDomains.Urls.Contains(hostUrl))
            return new ResponseToPage(false, "If you try this again you'll be banned...");

        using var context = this._factory.CreateDbContext();

        if (context.GameListRequests.Where(list => !list.Hidden).Any(list => list.SourceListUrl == url))
            return new ResponseToPage(false, "This list already exists and is pending validation.");

        if (context.GameLists.Any(list => list.SourceListUrl == url))
            return new ResponseToPage(false, "This list already exists and has been approved.");

        return new ResponseToPage(true, "This list is available.");
    }

    public async Task<long> GetGameListIdFromTitleAndYear(string listTitle, int? listYear)
    {
        var result = await GetGameListIdAndSlugFromTitleAndYear(listTitle, listYear);
        return result.id;
    }

    public async Task<string> GetGameListSlugFromTitleAndYear(string listTitle, int? listYear)
    {
        var result = await GetGameListIdAndSlugFromTitleAndYear(listTitle, listYear);
        return result.slug;
    }

    private async Task<(long id, string slug)> GetGameListIdAndSlugFromTitleAndYear(string listTitle, int? listYear)
    {
        using var context = this._factory.CreateDbContext();

        Console.WriteLine("Tenta pegar a lista que o usuário selecionou");

        var gameListIdAndSlug = new {Id = (long)0, Slug = ""};
        if (listYear != null && listYear != 0)
            gameListIdAndSlug = await context.FinalGameLists.AsNoTracking()
                                            .Where(x => x.Title == listTitle && x.Year == listYear.Value)
                                            .Select(list => new {list.Id, list.Slug})
                                            .FirstOrDefaultAsync();
        else
            gameListIdAndSlug = await context.FinalGameLists.AsNoTracking()
                                            .Where(x => x.Title == listTitle)
                                            .Select(list => new {list.Id, list.Slug})
                                            .FirstOrDefaultAsync();

        Console.WriteLine("Retorna a lista");

        return (gameListIdAndSlug.Id, gameListIdAndSlug.Slug);
    }

    public async Task<ResponseToPage> Create(GameListRequest gameListRequest)
    {
        gameListRequest = CleanReleaseDates(gameListRequest);
        var sourceUsedResponse = await ValidateSourceUrl(gameListRequest.SourceListUrl);
        if (!sourceUsedResponse.Success)
            return sourceUsedResponse;
        
        if (gameListRequest.GameRequests.Count > 15)
            return new ResponseToPage(false, "Max ammount of games is 15");

        if (gameListRequest.GameRequests.Count < 1)
            return new ResponseToPage(false, "The list must have at least one game.");

        using var context = this._factory.CreateDbContext();
        
        var gameList = await context.FinalGameLists.FirstOrDefaultAsync(x => x.Id == gameListRequest.FinalGameListId);
        if (gameList == null)
            return new ResponseToPage(false, "Specified game list was not found");

        var (_, uri) = IsValidURL(gameListRequest.SourceListUrl);
        var hostUrl = uri.Host;
        var source = context.Sources.FirstOrDefault(source => source.HostUrl == hostUrl);

        gameListRequest.HostUrl = hostUrl;
        gameListRequest.SourceName = source == null ? GetTemporarySourceName(uri) : source.Name;

        context.Add(gameListRequest);
        await context.SaveChangesAsync();

        return new ResponseToPage(true);
    }

    public async Task<GameList> GetUserGameListById(long gameListId) {
        using var context = this._factory.CreateDbContext();

        var gameList = await context.GameLists
                                    .Include(gameList => gameList.FinalGameList)
                                    .Include(gameList => gameList.Items)
                                    .ThenInclude(item => item.Game)
                                    .FirstOrDefaultAsync(gameList => gameList.Id == gameListId);

        return gameList;
    }

    public async Task<ResponseToPage> EditGameListForUser(long gameListId, GameListRequest gameListRequest) {
        try {
            if (gameListRequest is not null 
                && gameListRequest.GameRequests is not null
                && !gameListRequest.GameRequests.Any())
                return new ResponseToPage(false, "List needs at least one game to be created");

            using var context = this._factory.CreateDbContext();

            var gameList = await context.GameLists
                                .Include(gameList => gameList.Items)
                                .FirstOrDefaultAsync(gameList => gameList.Id == gameListId);

            if (gameList is null)
                return new ResponseToPage(false, "Game list not exists");

            if (gameList is not null && gameList.Items.Any()) {
                foreach(var item in gameList.Items) {
                    context.Items.Remove(item);
                }

                await context.SaveChangesAsync();
            }

            gameList.Items = new List<Item>();

            foreach (var gameRequest in gameListRequest.GameRequests) {
                gameList.Items.Add(new Item() {
                    Position = gameRequest.Position,
                    GameTitle = gameRequest.GameTitle,
                    GameId = gameRequest.GameId,
                    Score = 16 - gameRequest.Position,
                    FinalGameListId = gameListRequest.FinalGameListId,
                    GameListId = gameListId
                });
            }

            gameList.DateLastUpdated = DateTime.UtcNow;

            await context.SaveChangesAsync();
            return new ResponseToPage(true);
        } catch (Exception ex) {
            return new ResponseToPage(false, ex.Message);
        }

    }

    public async Task<ResponseToPage> CreateListForUser(GameListRequest gameListRequest) {

        using var context = this._factory.CreateDbContext();

        var allGameLists = context.GameLists.Where(gameList => gameList.UserContributedId == gameListRequest.UserPostedId && gameList.ByUser)
                                            .ToList();

        if (!gameListRequest.GameRequests.Any()) {
            return new ResponseToPage(false, "Please add at least one game to your list.");
        }

        if (allGameLists.Any(gameList => gameList.FinalGameListId == gameListRequest.FinalGameListId)) {
            return new ResponseToPage(false, "A list of this type already exists.");
        }

        var gameList = new GameList() {
            UserContributedId = gameListRequest.UserPostedId,
            Source = null,
            SourceListUrl = null,
            ByUser = true,
            FinalGameListId = gameListRequest.FinalGameListId,
            DateAdded = DateTime.UtcNow,
            Items = new List<Item>()
        };

        foreach (var gameRequest in gameListRequest.GameRequests) {
            gameList.Items.Add(new Item() {
                Position = gameRequest.Position,
                GameTitle = gameRequest.GameTitle,
                GameId = gameRequest.GameId,
                Score = 16 - gameRequest.Position,
                FinalGameListId = gameListRequest.FinalGameListId,
            });
        }

        gameList.DateLastUpdated = DateTime.UtcNow;

        try {
            context.GameLists.Add(gameList);
            await context.SaveChangesAsync();
            return new ResponseToPage(true);
        } catch (Exception ex) {
            return new ResponseToPage(false, ex.Message);
        }
    }

    public async Task<ResponseToPage> Delete(GameListRequest gameListRequest, string userNameId)
    {
        using var context = this._factory.CreateDbContext();
        var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.NameIdentifier == userNameId);
        var itemRequestDb = await context.GameListRequests.FindAsync(gameListRequest.Id);

        if (gameListRequest.UserPostedId != user.Id)
            return new ResponseToPage(false, "You can't delete something that's not yours");

        if (itemRequestDb == null)
            return new ResponseToPage(false, "Item not found");

        context.Remove(itemRequestDb);
        await context.SaveChangesAsync();
        return new ResponseToPage(true);
    }

    public List<KeyValuePair<long, int?>> GetAllGameListYearForSelectField(string listTitle)
    {
        using var context = this._factory.CreateDbContext();
        var gameListsYear = context.FinalGameLists.AsNoTracking()
                                             .Where(x => x.Title == listTitle)
                                             .OrderByDescending(x => x.Year)
                                             .Select(list => new KeyValuePair<long, int?>(list.Id, list.Year))
                                             .ToList();
        gameListsYear = [.. gameListsYear.DistinctBy(x => x.Value)];
        return gameListsYear;
    }

    public List<KeyValuePair<long, string>> GetAllGameListForSelectField()
    {
        using var context = this._factory.CreateDbContext();

        var finalGameLists = context.FinalGameLists.AsNoTracking()
                                         .Select(list => new KeyValuePair<long, string>(list.Id, list.Title))
                                         .ToList();

        finalGameLists = finalGameLists.DistinctBy(x => x.Value).ToList();

        return finalGameLists;
    }

    public List<GameListRequest> GetAll()
    {
        using var context = this._factory.CreateDbContext();
        var listItems = context.GameListRequests.Include(x => x.UsersLiked)
                                            .Include(x => x.UsersDisliked)
                                            .Include(x => x.FinalGameList)
                                            .ToList();
        return listItems;
    }

    public (List<GameListRequest>, Pager) GetAllPaged(bool myRequestsOnly = false, string? userNameId = null, int currentPage = 1, int pageSize = 10, int maxPages = 5, string? slug = null)
    {
        using var context = this._factory.CreateDbContext();
        var totalItems = context.GameListRequests.Where(x => !x.Hidden).Count();
        var pager = new Pager(totalItems, currentPage, pageSize, maxPages);

        var query = context.GameListRequests.Include(x => x.UsersLiked)
                                        .Include(x => x.UsersDisliked)
                                        .Include(x => x.UserPosted)
                                        .Include(x => x.FinalGameList)
                                        .Include(x => x.GameRequests)
                                        .Where(x => !x.Hidden)
                                        .OrderByDescending(x => x.Id)
                                        .AsQueryable();

        if (slug != null)
            query = query.Where(item => item.FinalGameList.Slug == slug);

        query = query.Skip((pager.CurrentPage - 1) * pager.PageSize)
                     .Take(pager.PageSize);

        if (myRequestsOnly && userNameId != null)
            query = query.Where(item => item.UserPosted.NameIdentifier == userNameId);

        var listItems = totalItems == 0 ? new List<GameListRequest>() : query.ToList();

        return (listItems, pager);
    }

    public async Task<GameListRequest> GetItem(long id)
    {
        using var context = this._factory.CreateDbContext();

        var item = await context.GameListRequests.Include(x => x.UsersLiked)
                                                 .Include(x => x.UsersDisliked)
                                                 .FirstOrDefaultAsync(x => x.Id == id);
        return item;
    }

    public async Task GiveLike(long itemRequestId, string userNameId)
    {
        if (string.IsNullOrEmpty(userNameId)) return;
        
        using var context = this._factory.CreateDbContext();

        var gameListRequest = await context.GameListRequests.Include(x => x.UsersLiked)
                                                        .Include(x => x.UsersDisliked)
                                                        .FirstOrDefaultAsync(x => x.Id == itemRequestId);

        var user = await context.Users.FirstOrDefaultAsync(x => x.NameIdentifier == userNameId);
                                              
        if (!gameListRequest.UsersLiked.Any(x => x.NameIdentifier == userNameId))
        {
            gameListRequest.GiveLike(user);
            await context.SaveChangesAsync();
        }
        else
        {
            gameListRequest.RemoveLike(user);
            await context.SaveChangesAsync();
        }
    }

    public async Task GiveDislike(long itemRequestId, string userNameId)
    {
        if (string.IsNullOrEmpty(userNameId)) return;

        using var context = this._factory.CreateDbContext();

        var gameListRequest = await context.GameListRequests.Include(x => x.UsersLiked)
                                                    .Include(x => x.UsersDisliked)
                                                    .FirstOrDefaultAsync(x => x.Id == itemRequestId);
        var user = await context.Users.FirstOrDefaultAsync(x => x.NameIdentifier == userNameId);

        if (!gameListRequest.UsersDisliked.Any(x => x.NameIdentifier == userNameId))
        {
            gameListRequest.GiveDislike(user);
            await context.SaveChangesAsync();
        }
        else
        {
            gameListRequest.RemoveDislike(user);
            await context.SaveChangesAsync();
        }
    }

    public async Task UpdateVisibility(long itemRequestId, bool visible)
    {
        using var context = this._factory.CreateDbContext();

        var itemRequest = context.GameListRequests.FirstOrDefault(item => item.Id == itemRequestId);

        if (itemRequest != null) {
            itemRequest.Hidden = !visible;

            context.Update(itemRequest);
            await context.SaveChangesAsync();
        }
    }

    private (bool,Uri?) IsValidURL(string url)
    {
        Uri? uriResult;
        return (Uri.TryCreate(url, UriKind.Absolute, out uriResult)
            && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps), uriResult);
    }

    private string GetTemporarySourceName(Uri uri, bool capitalize = true)
    {
        try
        {
            var source = uri.Host.Replace("www.","").Split('.')[0];
            if (capitalize)
                source = source[0].ToString().ToUpper() + source.Substring(1);
            return source;
        }
        catch { }

        return uri.Host.Replace("www.","");
    }

    private GameListRequest CleanReleaseDates(GameListRequest gameListRequest)
    {
        foreach (var item in gameListRequest.GameRequests)
            item.FirstReleaseDate = Regex.Replace(item.FirstReleaseDate, @"[^\d]", "");
        
        return gameListRequest;
    }
}
