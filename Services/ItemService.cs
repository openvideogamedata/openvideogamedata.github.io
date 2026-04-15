using community.Dtos;
using Microsoft.EntityFrameworkCore;

namespace community.Data;

public class ItemService
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    public ItemService(IDbContextFactory<ApplicationDbContext> factory)
    {
        this._factory = factory;
    }

    public async Task<ResponseToPage> ApproveGameList(GameListRequest gameListRequest)
    {
        using var context = this._factory.CreateDbContext();

        if (context.GameLists.Any(gl => gl.SourceListUrl == gameListRequest.SourceListUrl))
            return new ResponseToPage(false, "This list has already been approved.");

        var source = context.Sources.FirstOrDefault(source => source.HostUrl == gameListRequest.HostUrl);

        if (source == null) {
            source = new Source() {
                Name = gameListRequest.SourceName,
                HostUrl = gameListRequest.HostUrl
            };
            
            context.Sources.Add(source);
        }

        var gameList = new GameList() {
            UserContributedId = gameListRequest.UserPostedId,
            Source = source,
            SourceListUrl = gameListRequest.SourceListUrl,
            FinalGameListId = gameListRequest.FinalGameListId,
            DateAdded = DateTime.UtcNow,
            Items = new List<Item>(),
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

        context.GameLists.Add(gameList);
        await context.SaveChangesAsync();
        return new ResponseToPage(true);
    }

    public (List<GroupItem>, List<Item>) GetAll()
    {
        using var context = this._factory.CreateDbContext();

        var groupItems = context.Items
            .Include(item => item.Game)
            .GroupBy(item => item.GameTitle)
            .Select((group) => new GroupItem() { 
                                                 GameId = group.First().Game.Id,
                                                 GameTitle = group.Key,
                                                 Citations = group.Count(),
                                                 CoverImageUrl = group.First().Game.CoverImageUrl,
                                                 Score = group.Sum(x => x.Score)
                                               })
                                               .OrderByDescending(groupItem => groupItem.Score)
                                               .ToList();

        var items = context.Items.Include(x => x.Game)
                                 .ToList();

        return (groupItems, items);
    }
}