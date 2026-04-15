using community.Data;
using community.Dtos.Trackers;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/trackers")]
public class TrackersController : ControllerBase
{
    private readonly GameListRequestService _gameListRequestService;
    private readonly GameListService _gameListService;
    private readonly UserService _userService;
    private readonly TrackerService _trackerService;

    public TrackersController(
        GameListRequestService gameListRequestService,
        GameListService gameListService,
        UserService userService,
        TrackerService trackerService)
    {
        _gameListRequestService = gameListRequestService;
        _gameListService = gameListService;
        _userService = userService;
        _trackerService = trackerService;
    }

    [HttpGet("/api/users/{nickname}/tracker-years")]
    public IActionResult GetTrackerYears(string nickname, [FromQuery] int? trackStatus = null)
    {
        var user = _userService.GetByNickname(nickname);
        if (user is null) return NotFound();

        TrackStatus? status = trackStatus.HasValue ? (TrackStatus)trackStatus.Value : null;
        var years = _trackerService.GetDistinctTrackerYears(user.Id, status);
        return Ok(years);
    }

    [HttpGet("/api/users/{nickname}/tracker-stats")]
    public async Task<IActionResult> GetTrackerStats(string nickname)
    {
        var user = _userService.GetByNickname(nickname);
        if (user is null)
        {
            return NotFound();
        }

        var trackers = await _userService.GetTrackersByUserId(user.Id);
        return Ok(trackers.Select(x => new TrackFilterDto(x.TrackStatus, x.TrackStatusCount)).ToList());
    }

    [Authorize]
    [HttpGet("list-options")]
    public IActionResult GetListOptions()
    {
        return Ok(_gameListRequestService
            .GetAllGameListWithSlugForSelectField()
            .Select(x => new TrackerListOptionDto(x.Id, x.Title, x.Slug))
            .ToList());
    }

    [Authorize]
    [HttpGet("list-year-options")]
    public IActionResult GetListYearOptions([FromQuery] string title)
    {
        return Ok(_gameListRequestService
            .GetAllGameListYearForSelectField(title)
            .Select(x => new TrackerListYearOptionDto(x.Key, x.Value))
            .ToList());
    }

    [Authorize]
    [HttpGet("/api/users/{nickname}/trackers/compare")]
    public async Task<IActionResult> CompareTrackers(
        string nickname,
        [FromQuery] string listTitle,
        [FromQuery] int? year = null)
    {
        var user = _userService.GetByNickname(nickname);
        var visitor = _userService.GetLoggedUser();

        if (visitor is null)
        {
            return Unauthorized();
        }

        if (user is null)
        {
            return NotFound();
        }

        var areFriends = await _userService.AreFriends(visitor.Id, user.Id);
        if (!areFriends && visitor.Id != user.Id)
        {
            return Forbid();
        }

        var slug = await _gameListRequestService.GetGameListSlugFromTitleAndYear(listTitle, year);
        var (userTopWinners, _, _, _, _) = _gameListService.GetBySlug(slug, user.Id);
        var (visitorTopWinners, _, _, _, _) = _gameListService.GetBySlug(slug, visitor.Id);

        return Ok(new TrackerComparisonResponse(
            slug,
            userTopWinners.TrackerStats,
            visitorTopWinners.TrackerStats,
            userTopWinners.TopGames.Count));
    }
}
