using community.Data;
using community.Dtos;
using community.Dtos.GameLists;
using community.Mappers.GameLists;
using community.Services;
using community.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/game-lists")]
public class GameListsController : ControllerBase
{
    private readonly GameListService _gameListService;
    private readonly UserService _userService;

    public GameListsController(
        GameListService gameListService,
        UserService userService)
    {
        _gameListService = gameListService;
        _userService = userService;
    }

    [HttpGet("categories")]
    public IActionResult GetCategories(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 6,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? tags = null,
        [FromQuery] string? search = null)
    {
        var filters = BuildFilters(page, pageSize, maxPages, tags, search);
        var user = _userService.GetLoggedUser();
        var (lists, pager) = _gameListService.GetAllListsCategories(filters, user?.Id ?? 0);

        return Ok(new
        {
            lists = lists.Select(GameListMapper.ToCategoryDto).ToList(),
            pager,
            filters
        });
    }

    [HttpGet("pinned")]
    public IActionResult GetPinnedLists()
    {
        var user = _userService.GetLoggedUser();
        var lists = _gameListService.GetAllPinnedLists(user?.Id ?? 0);

        return Ok(lists.Select(GameListMapper.ToCategoryDto).ToList());
    }

    [HttpGet("{slug}")]
    public IActionResult GetBySlug(string slug)
    {
        var user = _userService.GetLoggedUser();
        var (
            topWinnersByCritics,
            topWinnersByUsers,
            sources,
            finalGameList,
            numberOfUsersLists) = _gameListService.GetBySlug(slug, user?.Id ?? 0);

        if (finalGameList is null)
        {
            return NotFound();
        }

        var contributors = _gameListService.GetTopContributors(slug);

        return Ok(new GameListDetailsResponse(
            GameListMapper.ToDetailsDto(finalGameList),
            topWinnersByCritics.TopGames.Select(GameListMapper.ToTopWinnerDto).ToList(),
            topWinnersByCritics.TrackerStats,
            topWinnersByUsers.TopGames.Select(GameListMapper.ToTopWinnerDto).ToList(),
            topWinnersByUsers.TrackerStats,
            sources?.Select(GameListMapper.ToSourceListDto).ToList() ?? new List<SourceListDto>(),
            numberOfUsersLists,
            contributors.Select(GameListMapper.ToContributorDto).ToList()));
    }

    [HttpGet("{slug}/critic-lists")]
    public IActionResult GetCriticLists(
        string slug,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 3,
        [FromQuery] int maxPages = 5)
    {
        if (!ListExists(slug))
        {
            return NotFound();
        }

        var (lists, pager) = _gameListService.GetAllGameListsBySlug(
            slug,
            page,
            pageSize,
            maxPages,
            byUser: false);

        return Ok(new GameListCollectionResponse(
            lists.Select(GameListMapper.ToGameListDto).ToList(),
            pager));
    }

    [HttpGet("{slug}/user-lists")]
    public IActionResult GetUserLists(
        string slug,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] int maxPages = 5)
    {
        if (!ListExists(slug))
        {
            return NotFound();
        }

        var (lists, pager) = _gameListService.GetAllGameListsBySlug(
            slug,
            page,
            pageSize,
            maxPages,
            byUser: true);

        return Ok(new GameListCollectionResponse(
            lists.Select(GameListMapper.ToGameListDto).ToList(),
            pager));
    }

    [HttpGet("{slug}/contributors")]
    public IActionResult GetContributors(string slug)
    {
        if (!ListExists(slug))
        {
            return NotFound();
        }

        var contributors = _gameListService.GetTopContributors(slug);
        return Ok(contributors.Select(GameListMapper.ToContributorDto).ToList());
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> CreateFinalGameList([FromBody] CreateFinalGameListDto request)
    {
        var result = await _gameListService.CreateFinalGameListAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateFinalGameList(long id, [FromBody] UpdateFinalGameListDto request)
    {
        var result = await _gameListService.UpdateFinalGameListAsync(id, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:long}/avg-consideration")]
    public IActionResult UpdateAvgConsideration(long id, [FromBody] UpdateAvgConsiderationRequest request)
    {
        if (_gameListService.GetById(id) is null)
        {
            return NotFound();
        }

        _gameListService.UpdateAvgConsideration(id, request.ConsideredForAvgScore);
        return NoContent();
    }

    private bool ListExists(string slug)
    {
        var (id, _) = _gameListService.GetGameListIdAndNameFromSlug(slug);
        return id.HasValue;
    }

    private static FilterListsCategory BuildFilters(
        int page,
        int pageSize,
        int maxPages,
        string? tags,
        string? search)
    {
        return new FilterListsCategory(
            page,
            pageSize,
            maxPages,
            ParseTags(tags),
            search ?? "");
    }

    private static List<string> ParseTags(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return new List<string> { Tags.All };
        }

        var parsed = tags
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(tag => tag.ToLowerInvariant())
            .Distinct()
            .ToList();

        return parsed.Count == 0 ? new List<string> { Tags.All } : parsed;
    }
}
