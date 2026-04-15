using community.Data;
using community.Dtos.ListSuggestions;
using community.Mappers.ListSuggestions;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/list-suggestions")]
public class ListSuggestionsController : ControllerBase
{
    private readonly GameListRequestService _gameListRequestService;
    private readonly ItemService _itemService;
    private readonly UserService _userService;

    public ListSuggestionsController(
        GameListRequestService gameListRequestService,
        ItemService itemService,
        UserService userService)
    {
        _gameListRequestService = gameListRequestService;
        _itemService = itemService;
        _userService = userService;
    }

    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? slug = null,
        [FromQuery] bool mine = false)
    {
        var (requests, pager) = _gameListRequestService.GetAllPaged(
            mine,
            _userService.GetLoggedUserNameIdentifier(),
            page,
            pageSize,
            maxPages,
            slug);

        return Ok(new
        {
            requests = requests.Select(ListSuggestionMapper.ToDto).ToList(),
            pager
        });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var request = await _gameListRequestService.GetItem(id);
        return request is null ? NotFound() : Ok(ListSuggestionMapper.ToDto(request));
    }

    [HttpGet("validate-source")]
    public async Task<IActionResult> ValidateSourceUrl([FromQuery] string url)
    {
        return Ok(await _gameListRequestService.ValidateSourceUrl(url));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGameListRequestInput request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var response = await _gameListRequestService.Create(ListSuggestionMapper.ToEntity(request, user.Id));
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [Authorize]
    [HttpPost("{id:long}/like")]
    public async Task<IActionResult> ToggleLike(long id)
    {
        await _gameListRequestService.GiveLike(id, _userService.GetLoggedUserNameIdentifier());
        return Ok(new VoteResponse(true));
    }

    [Authorize]
    [HttpPost("{id:long}/dislike")]
    public async Task<IActionResult> ToggleDislike(long id)
    {
        await _gameListRequestService.GiveDislike(id, _userService.GetLoggedUserNameIdentifier());
        return Ok(new VoteResponse(true));
    }

    [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var request = await _gameListRequestService.GetItem(id);
        if (request is null)
        {
            return NotFound();
        }

        var response = await _gameListRequestService.Delete(request, _userService.GetLoggedUserNameIdentifier());
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [Authorize(Roles = "admin")]
    [HttpPost("{id:long}/approve")]
    public async Task<IActionResult> Approve(long id)
    {
        var request = await _gameListRequestService.GetItem(id);
        if (request is null)
        {
            return NotFound();
        }

        var response = await _itemService.ApproveGameList(request);
        if (!response.Success)
            return BadRequest(response);

        await _gameListRequestService.UpdateVisibility(id, false);

        if (request.UserPosted is not null && request.FinalGameList is not null)
        {
            var message = $"Your submission for the list '{request.FinalGameList.GetFullName()}' has been approved!";
            await _userService.SendNotification(message, request.UserPosted.Id);
        }

        return Ok(response);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:long}/visibility")]
    public async Task<IActionResult> UpdateVisibility(long id, [FromBody] VisibilityRequest request)
    {
        await _gameListRequestService.UpdateVisibility(id, request.Visible);
        return NoContent();
    }
}
