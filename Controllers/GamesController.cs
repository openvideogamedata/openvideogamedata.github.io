using community.Data;
using community.Dtos.Games;
using community.Mappers.Games;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
    private readonly GameService _gameService;
    private readonly TrackerService _trackerService;
    private readonly UserService _userService;

    public GamesController(
        GameService gameService,
        TrackerService trackerService,
        UserService userService)
    {
        _gameService = gameService;
        _trackerService = trackerService;
        _userService = userService;
    }

    [HttpGet]
    public IActionResult GetGames(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? title = null,
        [FromQuery] int? trackStatus = null,
        [FromQuery] int? order = null,
        [FromQuery] bool onlyTracked = false,
        [FromQuery] int? trackerYear = null)
    {
        var filters = BuildFilters(page, pageSize, maxPages, title, trackStatus, order, trackerYear);
        var user = _userService.GetLoggedUser();
        var (games, pager) = _gameService.GetGames(
            user?.Id ?? 0,
            filters.Page,
            filters.SearchedText,
            filters.Status,
            filters.Order,
            onlyTracked,
            filters.PageSize,
            filters.MaxPages,
            filters.TrackerYear);

        return Ok(new
        {
            games = games.Select(GameMapper.ToSummaryDto).ToList(),
            pager,
            filters
        });
    }

    [HttpGet("/api/users/{nickname}/games")]
    public IActionResult GetGamesByUser(
        string nickname,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? title = null,
        [FromQuery] int? trackStatus = null,
        [FromQuery] int? order = null,
        [FromQuery] int? trackerYear = null)
    {
        var user = _userService.GetByNickname(nickname);
        if (user is null)
        {
            return NotFound();
        }

        var filters = BuildFilters(page, pageSize, maxPages, title, trackStatus, order, trackerYear);
        var (games, pager) = _gameService.GetGames(
            user.Id,
            filters.Page,
            filters.SearchedText,
            filters.Status,
            filters.Order,
            onlyTracked: trackStatus.HasValue,
            filters.PageSize,
            filters.MaxPages,
            filters.TrackerYear);

        return Ok(new
        {
            games = games.Select(GameMapper.ToSummaryDto).ToList(),
            pager,
        });
    }

    [HttpGet("search")]
    public IActionResult SearchGames(
        [FromQuery] string? title = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5)
    {
        var user = _userService.GetLoggedUser();
        var (games, pager) = _gameService.GetGames(
            user?.Id ?? 0,
            page,
            title ?? "",
            pageSize: pageSize,
            maxPages: maxPages);

        return Ok(new
        {
            games = games.Select(GameMapper.ToSummaryDto).ToList(),
            pager,
            search = title ?? ""
        });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetGame(long id)
    {
        var game = _gameService.GetGameById(id);
        if (game is null)
        {
            return NotFound();
        }

        var user = _userService.GetLoggedUser();
        GameUserTracker? tracker = null;
        List<GameUserTracker>? friendsTrackers = null;

        if (user is not null)
        {
            tracker = await _trackerService.GetByGameIdAndUserIdAsync(user.Id, id);
            friendsTrackers = await _userService.GetFriendsCommentsOnGame(user.Id, id);
        }

        var score = _gameService.GetScoreByGameId(id);
        var citations = _gameService.GetCitationsByGameId(id);

        return Ok(new
        {
            game = GameMapper.ToDetailsDto(game, score),
            tracker = tracker is null ? null : GameMapper.ToTrackerDto(tracker),
            friendsTrackers = friendsTrackers?.Select(GameMapper.ToFriendTrackerDto).ToList() ?? new List<FriendTrackerDto>(),
            citationsSummary = new
            {
                citations.NumberOfCategories,
                citations.MostCitedCategory,
                citations.MostCitedCategoryUrl
            }
        });
    }

    [HttpGet("{id:long}/citations")]
    public IActionResult GetCitations(
        long id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5)
    {
        if (_gameService.GetGameById(id) is null)
        {
            return NotFound();
        }

        var result = _gameService.GetCitationsByGameId(id, page, pageSize, maxPages);
        return Ok(new
        {
            citations = result.Citations.Select(GameMapper.ToCitationDto).ToList(),
            pager = result.PagerResult,
            result.NumberOfCategories,
            result.MostCitedCategory,
            result.MostCitedCategoryUrl
        });
    }

    [Authorize]
    [HttpGet("{id:long}/tracker")]
    public async Task<IActionResult> GetTracker(long id)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var tracker = await _trackerService.GetByGameIdAndUserIdAsync(user.Id, id);
        return Ok(tracker is null ? null : GameMapper.ToTrackerDto(tracker));
    }

    [Authorize]
    [HttpPut("{id:long}/tracker")]
    public async Task<IActionResult> CreateOrUpdateTracker(long id, [FromBody] UpdateGameTrackerRequest request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        if (_gameService.GetGameById(id) is null)
        {
            return NotFound();
        }

        var tracker = new GameUserTracker
        {
            GameId = id,
            UserId = user.Id,
            Status = request.Status,
            Note = request.Note,
            StatusDate = request.StatusDate ?? DateTime.MinValue,
            Platinum = request.Platinum
        };

        var updatedTracker = await _trackerService.CreateOrUpdate(tracker);
        await _userService.GiveBadge(3, user.Id);

        return Ok(GameMapper.ToTrackerDto(updatedTracker));
    }

    [Authorize]
    [HttpDelete("{id:long}/tracker")]
    public async Task<IActionResult> RemoveTrackerStatus(long id)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var existingTracker = await _trackerService.GetByGameIdAndUserIdAsync(user.Id, id);
        if (existingTracker is null)
        {
            return NotFound();
        }

        existingTracker.Status = TrackStatus.None;
        var updatedTracker = await _trackerService.CreateOrUpdate(existingTracker);

        return Ok(GameMapper.ToTrackerDto(updatedTracker));
    }

    private static GameFilters BuildFilters(
        int page,
        int pageSize,
        int maxPages,
        string? title,
        int? trackStatus,
        int? order,
        int? trackerYear)
    {
        var filters = new GameFilters(page, pageSize, maxPages, title ?? "");

        if (EnumHelper.IsValidEnumValue(typeof(TrackStatus), trackStatus))
        {
            filters.Status = (TrackStatus)trackStatus!.Value;
        }

        if (EnumHelper.IsValidEnumValue(typeof(GamesOrder), order))
        {
            filters.Order = (GamesOrder)order!.Value;
        }

        filters.TrackerYear = trackerYear;
        return filters;
    }

}
