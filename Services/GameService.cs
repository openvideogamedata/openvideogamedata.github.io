using community.Data;
using community.Utils;
using Microsoft.EntityFrameworkCore;

namespace community.Services;

public class GameService
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    public GameService(IDbContextFactory<ApplicationDbContext> factory)
    {
        this._factory = factory;
    }

    public (List<Game>, Pager) GetGames(long userId = 0, int currentPage = 1, string filter = "", TrackStatus status = TrackStatus.None, GamesOrder order = GamesOrder.ByLists, bool onlyTracked = false, int pageSize = 24, int maxPages = 5, int? trackerYear = null)
    {
        using var context = this._factory.CreateDbContext();

        System.Linq.Expressions.Expression<Func<Game, bool>> DbQuery = game => 
            game.Title.ToLower().Contains(filter.ToLower());

        var queryForTotalItems = context.Games.Include(game => game.Items)
                                      .Include(game => game.GameUserTrackers)
                                      .Where(DbQuery)
                                      .Select(game => new Game() {
                                        GameUserTracker = game.GameUserTrackers.FirstOrDefault(x => x.UserId == userId)
                                      })
                                      .AsQueryable();

        if (status is not TrackStatus.None) {
            queryForTotalItems = queryForTotalItems.Where(game => game.GameUserTracker != null && game.GameUserTracker.Status == status).AsQueryable();
        }
        else if (onlyTracked) {
            queryForTotalItems = queryForTotalItems.Where(game => game.GameUserTracker != null).AsQueryable();
        }
        var filterByTrackerYearOnlyWhenStatusIsNotToPlayOrPlaying = status is not TrackStatus.ToPlay && 
                                                                    status is not TrackStatus.Playing && 
                                                                    status is not TrackStatus.None && 
                                                                    trackerYear is not null;

        if (filterByTrackerYearOnlyWhenStatusIsNotToPlayOrPlaying) 
        {
            queryForTotalItems = queryForTotalItems.Where(game => game.GameUserTracker != null && game.GameUserTracker.StatusDate.Year == trackerYear).AsQueryable();
        }

        var orderByNumberOfLists = order == GamesOrder.ByLists;

        System.Linq.Expressions.Expression<Func<Game, int>> orderQuery;

        if (orderByNumberOfLists) {
            orderQuery = game => game.Items.Where(x => !x.GameList.ByUser).Count() * (-1);
        } else {
            orderQuery = game => game.Items.Where(x => !x.GameList.ByUser && x.FinalGameList.ConsideredForAvgScore).Count() > 3 ? 16-(game.Items.Where(x => !x.GameList.ByUser && x.FinalGameList.ConsideredForAvgScore).Sum(x => x.Score)/game.Items.Where(x => !x.GameList.ByUser && x.FinalGameList.ConsideredForAvgScore).Count()) : 16;
        }

        var totalItems = queryForTotalItems.Count();
                                      
        var pager = new Pager(totalItems, currentPage, pageSize, maxPages);
        var query = context.Games
                            .Include(game => game.Items)
                            .Include(game => game.GameUserTrackers)
                            .Where(DbQuery)
                            .OrderBy(orderQuery)
                            .ThenByDescending(game => game.Items.Where(x => !x.GameList.ByUser).Count())
                            .Select(game => new Game() {
                                Id = game.Id,
                                Title = game.Title,
                                FirstReleaseDate = game.FirstReleaseDate,
                                ExternalCoverImageId = game.ExternalCoverImageId,
                                NumberOfLists = game.Items.Where(x => !x.GameList.ByUser).Count(),
                                GameUserTracker = game.GameUserTrackers.FirstOrDefault(x => x.UserId == userId),
                                Score = game.Items.Where(x => !x.GameList.ByUser && x.FinalGameList.ConsideredForAvgScore).Count() > 3 ? 16-(game.Items.Where(x => !x.GameList.ByUser && x.FinalGameList.ConsideredForAvgScore).Sum(x => x.Score)/game.Items.Where(x => !x.GameList.ByUser && x.FinalGameList.ConsideredForAvgScore).Count()) : 16
                            })
                            .AsQueryable();

        if (order == GamesOrder.ByStatusDate) {
            query = query
                .OrderByDescending(game => game.GameUserTracker != null ? game.GameUserTracker.StatusDate : DateTime.MinValue)
                .ThenBy(game => game.Title)
                .AsQueryable();
        }

        if (status is not TrackStatus.None) {
            query = query.Where(game => game.GameUserTracker != null && game.GameUserTracker.Status == status).AsQueryable();
        }
        else if (onlyTracked) {
            query = query.Where(game => game.GameUserTracker != null).AsQueryable();
        }

        if (filterByTrackerYearOnlyWhenStatusIsNotToPlayOrPlaying) 
        {
            query = query.Where(game => game.GameUserTracker != null && game.GameUserTracker.StatusDate.Year == trackerYear).AsQueryable();
        }

        query = query.Skip((pager.CurrentPage - 1) * pager.PageSize)
                     .Take(pager.PageSize).AsQueryable();

        var games = query.ToList();

        return (games, pager);
    }

    public Game? GetGameById(long id) {
        using var context = this._factory.CreateDbContext();
        return context.Games.FirstOrDefault(game => game.Id == id);
    }

    public GamePageResults GetCitationsByGameId(long gameId, int currentPage = 1, int pageSize = 10, int maxPages = 5) {
        using var context = this._factory.CreateDbContext();

        var totalItems = context.Items.Where(item => item.GameId == gameId && !item.GameList.ByUser).Count();
        var pager = new Pager(totalItems, currentPage, pageSize, maxPages);

        var items = context.Items.Include(item => item.GameList)
                                 .ThenInclude(gameList => gameList.Source)
                                 .Include(item => item.FinalGameList)
                                 .Where(item => item.GameId == gameId && !item.GameList.ByUser)
                                 .OrderBy(x => x.Position)
                                 .ThenBy(x => x.FinalGameListId)
                                 .Skip((pager.CurrentPage - 1) * pager.PageSize)
                                 .Take(pager.PageSize)
                                 .ToList();

        var mostCitedOnResult = context.Items.Include(item => item.GameList)
                                 .Include(item => item.FinalGameList)
                                 .Where(item => item.GameId == gameId && !item.GameList.ByUser)
                                 .GroupBy(x => x.FinalGameListId)
                                 .ToList()
                                 .OrderByDescending(x => x.Count());

        var differentCategories = mostCitedOnResult.Count();
        var mostCitedOn = mostCitedOnResult.FirstOrDefault()?.FirstOrDefault()?.FinalGameList;

        return new(items, pager, differentCategories, mostCitedOn?.GetFullName(), mostCitedOn?.Slug);
    }

    public int GetScoreByGameId(long gameId) {
        using var context = this._factory.CreateDbContext();

        var items = context.Items.Include(item => item.GameList)
                                 .ThenInclude(gameList => gameList.Source)
                                 .Include(item => item.FinalGameList)
                                 .Where(item => item.GameId == gameId && !item.GameList.ByUser && item.FinalGameList.ConsideredForAvgScore)
                                 .ToList();

        if (items != null && items.Count > 3)
        {
            var totalScoreSum = items.Sum(x => x.Score);
            var finalScore = (double)(totalScoreSum/items.Count);

            return 16 - (int)Math.Round(finalScore);
        }

        return 0;
    }

    public async Task<IList<int>> GetMostPickedGamesFromList(string listSugestionUrl, IList<int> ids)
    {
        try
        {
            var listSlug = listSugestionUrl.Split('/').Last();
            return await GetMostPickedGamesFromSlug(listSlug, ids);
        }
        catch(Exception e)
        {
            Console.WriteLine($"[ERRO] - GetMostPickedGamesFromList - {e.Message}", e);
            return new List<int>();
        }
    }

    public async Task<IList<int>> GetMostPickedGamesFromSlug(string slug, IList<int> ids)
    {
        var idsLong = ids.Select(x => long.Parse(x.ToString()));

        using var context = this._factory.CreateDbContext();

        var finalGameListId = await context.FinalGameLists
            .Where(x => x.Slug == slug)
            .Select(x => x.Id)
            .FirstOrDefaultAsync();

        if (finalGameListId == 0)
        {
            return new List<int>();
        }

        var gamesExternalIds = await context.Games
            .Where(x => idsLong.Contains(x.ExternalId))
            .Where(x => x.Items.Any(x => x.FinalGameListId == finalGameListId))
            .Select(x => x.ExternalId)
            .ToListAsync();

        return gamesExternalIds.Select(x => int.Parse(x.ToString())).ToList();
    }

    public long Create(GetGameApiReturn game)
    {
        Console.WriteLine("GameService - Tenta criar um jogo ou retornar se ele já existe");

        using var context = this._factory.CreateDbContext();
        var gameAlreadySaved = context.Games.FirstOrDefault(x => x.ExternalId == game.Id);

        if (gameAlreadySaved != null) {
            Console.WriteLine("GameService - Jogo já existe apenas retorna");
            return gameAlreadySaved.Id;
        }
        
        var releaseDateTime = DateTimeOffset.FromUnixTimeSeconds(game.FirstReleaseDate).DateTime;
        var item = new Game()
        {
            ExternalId = game.Id,
            Title = game.Name,
            FirstReleaseDate = DateTime.SpecifyKind(releaseDateTime, DateTimeKind.Utc),
            ExternalCoverImageId = game.Cover?.ImageId
        };

        context.Add(item);
        context.SaveChanges();

        Console.WriteLine("GameService - Jogo criado pois ele não existia na base de dados");

        return item.Id;
    }

    public long? GetLocalGameIdByExternalId(long externalId)
    {
        using var context = this._factory.CreateDbContext();
        return context.Games
            .Where(x => x.ExternalId == externalId)
            .Select(x => (long?)x.Id)
            .FirstOrDefault();
    }
}
