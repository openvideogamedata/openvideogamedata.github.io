using Microsoft.EntityFrameworkCore;
using community.Utils;
using community.Dtos;
using community.Dtos.GameLists;
using community.Mappers.GameLists;

namespace community.Data;

public class GameListService
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    private const int _numberOfGamesOnTopWinners = 15;
    public GameListService(IDbContextFactory<ApplicationDbContext> factory)
    {
        this._factory = factory;
    }

    public async Task<ResponseToPage> CreateFinalGameListAsync(CreateFinalGameListDto request)
    {
        if (request == null)
            return new ResponseToPage(false, "Dados invalidos.");

        if (string.IsNullOrWhiteSpace(request.Title))
            return new ResponseToPage(false, "Informe o titulo da lista.");

        if (string.IsNullOrWhiteSpace(request.SocialUrl))
            return new ResponseToPage(false, "Informe a URL social.");

        if (string.IsNullOrWhiteSpace(request.Tags))
            return new ResponseToPage(false, "Informe pelo menos uma tag.");

        try
        {
            var slugSource = string.IsNullOrWhiteSpace(request.Slug) ? request.Title : request.Slug;
            var slug = slugSource.ToUrlSlug();

            if (string.IsNullOrWhiteSpace(slug))
                return new ResponseToPage(false, "Nao foi possivel gerar o slug para essa lista.");

            using var context = this._factory.CreateDbContext();
            var slugAlreadyExists = await context.FinalGameLists.AnyAsync(x => x.Slug == slug);
            if (slugAlreadyExists)
                return new ResponseToPage(false, "Ja existe uma lista com esse slug.");

            var finalGameList = new FinalGameList()
            {
                Title = request.Title.Trim(),
                Year = request.Year,
                Slug = slug,
                SocialUrl = request.SocialUrl.Trim(),
                Tags = request.Tags.Trim(),
                ConsideredForAvgScore = request.ConsideredForAvgScore,
                Pinned = request.Pinned,
                PinnedPriority = request.Pinned ? Math.Max(0, request.PinnedPriority) : 0
            };

            finalGameList.SetSocialComments(Math.Max(0, request.SocialComments));

            context.FinalGameLists.Add(finalGameList);
            await context.SaveChangesAsync();
            return new ResponseToPage(true, "Lista mestra criada com sucesso.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERRO] - CreateFinalGameListAsync - {ex.Message}", ex);
            return new ResponseToPage(false, "Nao foi possivel criar a lista mestra.");
        }
    }

    public async Task<ResponseToPage> UpdateFinalGameListAsync(long id, UpdateFinalGameListDto request)
    {
        if (request == null)
            return new ResponseToPage(false, "Dados invalidos.");

        if (string.IsNullOrWhiteSpace(request.Title))
            return new ResponseToPage(false, "Informe o titulo da lista.");

        if (string.IsNullOrWhiteSpace(request.Tags))
            return new ResponseToPage(false, "Informe pelo menos uma tag.");

        if (!string.IsNullOrWhiteSpace(request.SocialUrl)
            && !Uri.TryCreate(request.SocialUrl.Trim(), UriKind.Absolute, out _))
        {
            return new ResponseToPage(false, "Informe uma URL valida.");
        }

        try
        {
            using var context = this._factory.CreateDbContext();
            var list = await context.FinalGameLists.FirstOrDefaultAsync(x => x.Id == id);
            if (list is null)
                return new ResponseToPage(false, "Lista nao encontrada.");

            list.Title = request.Title.Trim();
            list.Year = request.Year;
            list.SocialUrl = string.IsNullOrWhiteSpace(request.SocialUrl)
                ? null
                : request.SocialUrl.Trim();
            list.Tags = request.Tags.Trim();
            list.ConsideredForAvgScore = request.ConsideredForAvgScore;
            list.Pinned = request.Pinned;
            list.PinnedPriority = request.Pinned ? Math.Max(0, request.PinnedPriority) : 0;
            list.SetSocialComments(Math.Max(0, request.SocialComments));

            await context.SaveChangesAsync();
            return new ResponseToPage(true, "Lista mestra atualizada com sucesso.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERRO] - UpdateFinalGameListAsync - {ex.Message}", ex);
            return new ResponseToPage(false, "Nao foi possivel atualizar a lista mestra.");
        }
    }

    public List<FinalGameList>  GetAllPinnedLists(long userId)
    {
        using var context = this._factory.CreateDbContext();

        var pinnedLists = context.FinalGameLists
            .Include(list => list.GameLists)
            .ThenInclude(gameList => gameList.Items)
            .Include(list => list.GameLists)
            .ThenInclude(gameList => gameList.Source)
            .Where(list => list.Pinned)
            .OrderByDescending(list => list.PinnedPriority)
            .Select(list => new FinalGameList() {
                Id = list.Id,
                Title = list.Title,
                Year = list.Year,
                NumberOfGames = context.Items.Where(item => item.FinalGameListId == list.Id && !item.GameList.ByUser).GroupBy(item => item.GameId).Count(),
                NumberOfSources = list.GameLists.Where(gameList => !gameList.ByUser).Distinct().Count(),
                Slug = list.Slug,
                Pinned = list.Pinned
            }).ToList();
        
        var onlyTheFirstThreeGames = 4;

        foreach (var pinnedList in pinnedLists) {
            var allSources = GetAllSourceFromList(context, pinnedList.Id);
            double totalNumberOfSources = context.GameLists.Count(gl => gl.FinalGameListId == pinnedList.Id && !gl.ByUser);
            var topWinners = GetTopWinners(context, onlyTheFirstThreeGames, pinnedList.Id, totalNumberOfSources, userId);
            pinnedList.TopThreeWinners.AddRange(topWinners);
        }

        return pinnedLists;
    }

    public (int, int) GetTotalNumberOfGameListAndUsers() {
        using var context = this._factory.CreateDbContext();

        var totalNumberOfGameList = context.GameLists.Count();
        var totalNUmberOfUsers = context.Users.Count();
        
        return (totalNumberOfGameList, totalNUmberOfUsers);
    }

    public List<UserActivityData> GetUserActivity() {
        using var context = this._factory.CreateDbContext();

        var allUserActivitData = new List<UserActivityData>();

        var trackers = context.GameUserTrackers
                                .Include(tracker => tracker.User)
                                .Where(tracker => tracker.Status != TrackStatus.None)
                                .OrderByDescending(tracker => tracker.LastUpdateDate)
                                .Take(30)
                                .ToList()
                                .GroupBy(x => x.UserId)
                                .Select(x => x.GroupBy(y => y.LastUpdateDate))
                                .Select(x => new UserActivityData(x));
        if (trackers != null)
            allUserActivitData.AddRange(trackers);

        var gameLists = context.GameLists.Include(gameList => gameList.FinalGameList)
                                .Include(gameList => gameList.UserContributed)
                                .Where(gameList => gameList.ByUser && gameList.Items.Any())
                                .OrderByDescending(gameList => gameList.DateAdded)
                                .Take(5)
                                .ToList()
                                .Select(x => new UserActivityData(x));
        if (allUserActivitData != null)
            allUserActivitData.AddRange(gameLists);

        allUserActivitData = allUserActivitData.OrderByDescending(x => x.DateAdded).Take(5).ToList();
                                
        return allUserActivitData;
    }

    public (List<FinalGameList>, Pager) GetAllListsCategories(FilterListsCategory filters, long userId) {
        try
        {
            using var context = this._factory.CreateDbContext();

            var query = context.FinalGameLists
                .Include(list => list.GameLists)
                .ThenInclude(gameList => gameList.Source)
                .OrderBy(x => x.Id)
                .AsQueryable();

            if (filters.TagsToFilter.Contains(Tags.All)) {
                filters.TagsToFilter = new List<string>();
            }

            if (filters.TagsToFilter.Contains(Tags.Year)) {
                query = query.Where(list => list.Tags.Contains(Tags.Year)).OrderByDescending(x => x.Year);
            }

            foreach (var tag in filters.TagsToFilter) {
                query = query.Where(list => list.Tags.Contains(tag.ToLower()));
            }

            if (!string.IsNullOrEmpty(filters.SearchedText))
                query = query.Where(list => list.Title.ToLower().Contains(filters.SearchedText.ToLower()) || list.Year.ToString().Contains(filters.SearchedText.ToLower()));

            var totalItems = query.Count();

            var pager = new Pager(totalItems, filters.Page, filters.PageSize, filters.MaxPages);

            query = query.Skip((pager.CurrentPage - 1) * pager.PageSize)
                        .Select(list => new FinalGameList() {
                            Id = list.Id,
                            Title = list.Title,
                            Year = list.Year,
                            NumberOfGames = context.Items.Where(item => item.FinalGameListId == list.Id && !item.GameList.ByUser).GroupBy(item => item.GameId).Count(),
                            NumberOfSources = list.GameLists.Distinct().Count(),
                            Slug = list.Slug,
                            Pinned = list.Pinned
                        }).Take(pager.PageSize);

            var ammountToShow = 4;
            var lists = query.ToList();

            foreach (var list in lists) {
                var allSources = GetAllSourceFromList(context, list.Id);
                double totalNumberOfSources = context.GameLists.Count(gl => gl.FinalGameListId == list.Id && !gl.ByUser);
                var topWinners = GetTopWinners(context, ammountToShow, list.Id, totalNumberOfSources, userId);
                list.TopThreeWinners.AddRange(topWinners);
            }

            return (lists, pager);
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - GetAllOtherLists - {e.Message}\n {e}");
            return (new List<FinalGameList>(), new Pager(0, filters.Page, filters.PageSize, filters.MaxPages));
        }
    }

    public (long?, string?) GetGameListIdAndNameFromSlug(string slug)
    {
        using var context = this._factory.CreateDbContext();
        var gameList = context.FinalGameLists.FirstOrDefault(list => list.Slug == slug);
        return (gameList?.Id, gameList?.Title);
    }

    public (TopWinners, TopWinners, List<SourceList>?, FinalGameList?, double) GetBySlug(string slug, long userId)
    {
        using var context = this._factory.CreateDbContext();

        FinalGameList? finalGameList = null;
        List<GroupItem>? topWinnersByCritic = null;
        List<GroupItem>? topWinnersByUser = null;
        List<SourceList>? allSources = null;
        List<SourceList>? similarLists = null;
        double totalNumberOfUsers = 0;

        finalGameList = context.FinalGameLists.Include(finalGameList => finalGameList.GameLists)
                                               .FirstOrDefault(list => list.Slug == slug);

        if (finalGameList != null) {
            similarLists = context.FinalGameLists.Where(list => list.Id != finalGameList.Id && list.Tags.Contains(finalGameList.Tags))
                                                 .Select(item => new SourceList(item.Title, item.Slug, null, item.Year))
                                                 .ToList();

            if (similarLists != null) {
                finalGameList.SimilarLists = similarLists;
            }

            allSources = GetAllSourceFromList(context, finalGameList.Id);
            double totalNumberOfSources = context.GameLists.Count(gl => gl.FinalGameListId == finalGameList.Id && !gl.ByUser);
            topWinnersByCritic = GetTopWinners(context, _numberOfGamesOnTopWinners, finalGameList.Id, totalNumberOfSources, userId);

            totalNumberOfUsers = GetNumberOfUsersFromList(context, finalGameList.Id);
            topWinnersByUser = GetTopWinners(context, _numberOfGamesOnTopWinners, finalGameList.Id, totalNumberOfUsers, userId, byUsers: true);
        }

        var topWinnersCriticDto = new TopWinners(topWinnersByCritic);
        var topWinnersUsersDto = new TopWinners(topWinnersByUser);
        return (topWinnersCriticDto, topWinnersUsersDto, allSources, finalGameList, totalNumberOfUsers);
    }

    private double GetNumberOfUsersFromList(ApplicationDbContext context, long finalGameListId) {
        return context.GameLists.Where(gameList => gameList.ByUser && gameList.FinalGameListId == finalGameListId).Count();
    }

    private List<SourceList>? GetAllSourceFromList(ApplicationDbContext context, long finalGameListId) 
    {
        var sources = context.Items
            .Include(item => item.GameList)
            .ThenInclude(gameList => gameList.Source)
            .Where(item => item.FinalGameListId == finalGameListId && !item.GameList.ByUser)
            .Select(item => new SourceList(item.GameList.Source == null ? "" : item.GameList.Source.Name, item.GameList.SourceListUrl, item.GameList.DateLastUpdated, null))
            .ToList();

        var allSources = sources.GroupBy(item => new Uri(item.SourceUrl).Host)
                                .Select(item => new SourceList(item.First().SourceName, item.First().SourceUrl, item.First().SourceDateLastUpdated, item.First().Year))
                                .ToList();
        
        return allSources;
    }

    public void GenerateAllTopWinners() 
    {
        using var context = this._factory.CreateDbContext();

        var finalGameLists = context.FinalGameLists.ToList();

        foreach (var finalGameList in finalGameLists) {
            var queryItems = context.Items.Where(item => item.FinalGameListId == finalGameList.Id).AsQueryable();

            var allSources = GetAllSourceFromList(context, finalGameList.Id);
            double totalNumberOfSources = allSources.Count();

            if (totalNumberOfSources > 0) {

                var gruposinistro = queryItems
                .Where(item => !item.GameList.ByUser)
                .Include(item => item.Game)
                .ThenInclude(game => game.GameUserTrackers)
                .GroupBy(item => item.GameTitle)
                .Select((group) => new TopWinner() { GameTitle = group.Key,
                                                    GameId = group.First().Game.Id,
                                                    TrackStatus = TrackStatus.None,
                                                    FirstReleaseDate = group.First().Game.FirstReleaseDate,
                                                    PorcentageOfCitations = (int)Math.Round((double)(100 * group.Count()) / totalNumberOfSources),
                                                    Citations = group.Count(),
                                                    CoverImageUrl = group.First().Game.CoverBigImageUrl,
                                                    Score = group.Sum(x => x.Score),
                                                    Position = 0,
                                                    GameListId = group.First().GameListId,
                                                    FinalGameListId = group.First().FinalGameListId,
                                                    ByUser = false,
                                                })
                                                .OrderByDescending(groupItem => groupItem.Score)
                                                .ThenBy(groupItem => groupItem.Citations)
                                                .GroupBy(groupItem => groupItem.Score) 
                                                .AsNoTracking()
                                                .ToList();

                var final = gruposinistro.TakeLast(15).Reverse();
                var lastScore = 0;
                var topWinners = new List<TopWinner>();
                var currentPosition = 0;

                foreach (var f in final) {
                    foreach(var game in f.ToList()) {
                        if (game.Score != lastScore) {
                            currentPosition++;
                        }

                        lastScore = game.Score;
                        game.Position = currentPosition;
                        topWinners.Add(game);
                    }
                }

                context.TopWinners.AddRange(topWinners);
                context.SaveChanges();
            }
        }
    }

    private List<GroupItem> GetTopWinners(ApplicationDbContext context, int numberOfGames, 
        long finalGameListId, double totalNumberOfSources, long userId, bool byUsers = false) 
    {
        if (!byUsers) {
            var queryInDb = context.TopWinners
                .OrderBy(item => item.Position)
                .Where(item => item.FinalGameListId == finalGameListId && !item.GameList.ByUser)
                .Select((item) => new GroupItem() { GameTitle = item.GameTitle,
                                                    GameId = item.GameId,
                                                    TrackStatus = item.Game.GameUserTrackers.FirstOrDefault(track => track.UserId == userId) != null ? 
                                                        item.Game.GameUserTrackers.FirstOrDefault(track => track.UserId == userId).Status :
                                                        TrackStatus.None,
                                                    FirstReleaseDate = item.FirstReleaseDate,
                                                    PorcentageOfCitations = item.PorcentageOfCitations,
                                                    Citations = item.Citations,
                                                    CoverImageUrl = item.CoverImageUrl,
                                                    Score = item.Score,
                                                    Position = item.Position,
                                                    GameListId = item.GameListId,
                                                    FinalGameListId = item.FinalGameListId,
                                            }).AsQueryable();
            
            if (numberOfGames != 15) {
                queryInDb = queryInDb.Take(numberOfGames).AsQueryable();
            }

            var topWinnersInDb = queryInDb.ToList();

            if (topWinnersInDb.Any()) {
                return topWinnersInDb;
            }
        }

        var query = context.Items.Include(item => item.GameList).AsQueryable();

        if (byUsers) {
            query = query.Where(item => item.FinalGameListId == finalGameListId && item.GameList.ByUser);
        } else {
            query = query.Where(item => item.FinalGameListId == finalGameListId && !item.GameList.ByUser);
        }
        
        var topWinners = query
            .Include(item => item.Game)
            .ThenInclude(game => game.GameUserTrackers)
            .GroupBy(item => item.GameTitle)
            .Select((group) => new GroupItem() { GameTitle = group.Key,
                                                GameId = group.First().Game.Id,
                                                TrackStatus = group.First().Game.GameUserTrackers
                                                    .FirstOrDefault(track => track.UserId == userId) != null ? group.First().Game.GameUserTrackers
                                                    .FirstOrDefault(track => track.UserId == userId).Status : TrackStatus.None,
                                                FirstReleaseDate = group.First().Game.FirstReleaseDate,
                                                PorcentageOfCitations = (int)Math.Round((double)(100 * group.Count()) / totalNumberOfSources),
                                                Citations = group.Count(),
                                                CoverImageUrl = group.First().Game.CoverBigImageUrl,
                                                Score = group.Sum(x => x.Score),
                                                Position = group.First().Position,
                                                GameListId = group.First().GameListId,
                                                FinalGameListId = group.First().FinalGameListId,
                                            })
                                            .OrderByDescending(groupItem => groupItem.Score)
                                            .Take(numberOfGames)
                                            .AsNoTracking()
                                            .ToList();

        return topWinners;
    }

    public (List<GameList>, Pager) GetAllGameListsBySlug(string slug, int currentPage = 1, int pageSize = 3, int maxPages = 5, bool byUser = false) 
    {
        using var context = this._factory.CreateDbContext();
        int totalItems = 0;

        if (byUser) {
            totalItems = context.GameLists.Where(gameList => gameList.FinalGameList.Slug == slug && gameList.ByUser).Count();
        } else {
            totalItems = context.GameLists.Where(gameList => gameList.FinalGameList.Slug == slug && !gameList.ByUser).Count();
        }

        var pager = new Pager(totalItems, currentPage, pageSize, maxPages);

        if (totalItems <= 0) {
            return (new List<GameList>(), pager);
        }

        var query = context.GameLists.Include(gameList => gameList.FinalGameList)
                                         .Include(gameList => gameList.UserContributed)
                                         .Include(gameList => gameList.Items)
                                         .Include(gameList => gameList.Source)
                                         .Where(gameList => gameList.FinalGameList.Slug == slug)
                                         .AsQueryable();

        if (byUser) {
            query = query.Where(gameList => gameList.ByUser);
        } else {
            query = query.Where(gameList => !gameList.ByUser);
        }

        var gameLists = query.Skip((pager.CurrentPage - 1) * pager.PageSize)
                    .Take(pager.PageSize)
                    .ToList();

        return (gameLists ?? new List<GameList>(), pager);
    }

    public List<Contributor> GetTopContributors(string slug) 
    {
        using var context = this._factory.CreateDbContext();

        var contributors = context.Items.Include(item => item.GameList)
                                        .ThenInclude(gameList => gameList.FinalGameList)
                                        .Where(item => item.GameList.FinalGameList.Slug == slug && !item.GameList.ByUser)
                                        .Select(item => new Contributor((long)item.GameList.UserContributedId, item.GameList.UserContributed.FullName, item.GameList.UserContributed.Nickname, 1, 0))
                                        .ToList();

        var totalNumberOfContributions = contributors.Count();

        var uniqueContributors = contributors
            .GroupBy(item => item.UserContributedId)
            .Select(item => new Contributor(item.First().UserContributedId, item.First().FullName, item.First().Nickname, item.Count(), (int)Math.Round((double)(100 * item.Count()) / totalNumberOfContributions)))
            .OrderByDescending(item => item.NumberOfContributions)
            .Take(5);

        return uniqueContributors.ToList();
    }

    public void UpdateAvgConsideration(long listId, bool consideredForAvgScore)
    {
        using var context = this._factory.CreateDbContext();
        var gameList = context.FinalGameLists.Find(listId);
        if (gameList != null)
        {
            gameList.ConsideredForAvgScore = consideredForAvgScore;
            context.Update(gameList);
            context.SaveChanges();
        }
    }

    public (List<SourceAggregateDto> Sources, Pager Pager) GetSourceAggregates(
        int page = 1,
        int pageSize = 15,
        int maxPages = 5,
        string? search = null)
    {
        using var context = _factory.CreateDbContext();

        var sourceQuery = context.Sources
            .AsNoTracking()
            .Where(source => context.GameLists.Any(gameList => !gameList.ByUser && gameList.SourceId == source.Id));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            sourceQuery = sourceQuery.Where(source =>
                (source.Name ?? string.Empty).ToLower().Contains(normalized) ||
                (source.HostUrl ?? string.Empty).ToLower().Contains(normalized));
        }

        var sourceIds = sourceQuery.Select(s => s.Id).ToList();

        var listCounts = context.GameLists
            .AsNoTracking()
            .Where(gl => !gl.ByUser && gl.SourceId.HasValue && sourceIds.Contains(gl.SourceId!.Value))
            .GroupBy(gl => gl.SourceId!.Value)
            .Select(g => new { SourceId = g.Key, ListsCount = g.Count() })
            .ToDictionary(x => x.SourceId, x => x.ListsCount);

        var orderedIds = sourceIds
            .OrderByDescending(id => listCounts.GetValueOrDefault(id, 0))
            .ToList();

        var totalItems = orderedIds.Count;
        var pager = new Pager(totalItems, page, pageSize, maxPages);

        var pagedIds = orderedIds
            .Skip((pager.CurrentPage - 1) * pager.PageSize)
            .Take(pager.PageSize)
            .ToList();

        var aggregates = context.GameLists
            .AsNoTracking()
            .Where(gl => !gl.ByUser && gl.SourceId.HasValue && pagedIds.Contains(gl.SourceId!.Value))
            .GroupBy(gl => gl.SourceId!.Value)
            .Select(g => new
            {
                SourceId = g.Key,
                ListsCount = g.Count(),
                CategoriesCount = g.Where(gl => gl.FinalGameListId.HasValue)
                    .Select(gl => gl.FinalGameListId!.Value)
                    .Distinct()
                    .Count(),
                LastActivity = g.Max(gl => gl.DateLastUpdated != null ? gl.DateLastUpdated : (DateTime?)gl.DateAdded)
            })
            .ToDictionary(x => x.SourceId);

        var sourcesRaw = context.Sources
            .AsNoTracking()
            .Where(s => pagedIds.Contains(s.Id))
            .ToList();

        var sources = pagedIds
            .Select(id =>
            {
                var s = sourcesRaw.First(x => x.Id == id);
                var agg = aggregates.GetValueOrDefault(id);
                return new SourceAggregateDto(
                    s.Id,
                    s.Name,
                    s.HostUrl,
                    agg?.ListsCount ?? 0,
                    agg?.CategoriesCount ?? 0,
                    agg?.LastActivity);
            })
            .ToList();

        return (sources, pager);
    }

    public SourceDetailsResponse? GetSourceDetails(long sourceId, int page = 1, int pageSize = 15, int maxPages = 5)
    {
        using var context = _factory.CreateDbContext();

        var source = context.Sources
            .AsNoTracking()
            .FirstOrDefault(x => x.Id == sourceId);

        if (source is null)
            return null;

        var baseQuery = context.GameLists
            .AsNoTracking()
            .Include(x => x.Source)
            .Include(x => x.FinalGameList)
            .Include(x => x.Items)
            .ThenInclude(x => x.Game)
            .Where(x => !x.ByUser && x.SourceId == sourceId);

        var totalItems = baseQuery.Count();
        var pager = new Pager(totalItems, page, pageSize, maxPages);

        var lists = baseQuery
            .OrderByDescending(x => x.DateLastUpdated ?? x.DateAdded)
            .ThenByDescending(x => x.DateAdded)
            .Skip((pager.CurrentPage - 1) * pager.PageSize)
            .Take(pager.PageSize)
            .ToList();

        var masterListsQuery = context.GameLists
            .AsNoTracking()
            .Include(x => x.FinalGameList)
            .Where(x => !x.ByUser && x.SourceId == sourceId && x.FinalGameListId.HasValue && x.FinalGameList != null)
            .GroupBy(x => new
            {
                x.FinalGameList!.Id,
                x.FinalGameList.Title,
                x.FinalGameList.Year,
                x.FinalGameList.Slug
            })
            .Select(group => new SourceMasterListDto(
                group.Key.Id,
                group.Key.Title,
                group.Key.Year,
                group.Key.Slug,
                group.Count()));

        var categoriesCount = masterListsQuery.Count();

        var masterLists = masterListsQuery
            .OrderByDescending(x => x.ListsCount)
            .ThenBy(x => x.Title)
            .Take(8)
            .ToList();

        var details = new SourceDetailsDto(
            source.Id,
            source.Name,
            source.HostUrl,
            totalItems,
            categoriesCount,
            baseQuery.Max(x => x.DateLastUpdated != null ? x.DateLastUpdated : (DateTime?)x.DateAdded),
            masterLists);

        return new SourceDetailsResponse(
            details,
            lists.Select(GameListMapper.ToGameListDto).ToList(),
            pager);
    }

    public FinalGameList? GetById(long listId)
    {
        using var context = _factory.CreateDbContext();
        var gameList = context.FinalGameLists
                                        .Include(list => list.GameLists)
                                        .ThenInclude(gameList => gameList.Items)
                                        .Include(list => list.GameLists)
                                        .ThenInclude(gameList => gameList.Source)
                                        .Select(list => new FinalGameList() {
                                            Id = list.Id,
                                            Title = list.Title,
                                            Year = list.Year,
                                            NumberOfGames = context.Items.Where(item => item.FinalGameListId == list.Id && !item.GameList.ByUser).GroupBy(item => item.GameId).Count(),
                                            NumberOfSources = list.GameLists.Where(gameList => !gameList.ByUser).Distinct().Count(),
                                            Slug = list.Slug,
                                            Pinned = list.Pinned
                                        })
                                        .FirstOrDefault(list => list.Id == listId);

        var onlyTheFirstThreeGames = 4;

        if (gameList is not null) {
            var allSources = GetAllSourceFromList(context, gameList.Id);

            if (allSources is not null) {
                double totalNumberOfSources = allSources.Count();
                var topWinners = GetTopWinners(context, onlyTheFirstThreeGames, gameList.Id, totalNumberOfSources, 1);
                gameList.TopThreeWinners.AddRange(topWinners);
            }
        }

        return gameList;
    }
}
