using community.Data;
using community.Dtos.GameLists;
using community.Dtos.UserLists;
using community.Mappers.GameLists;
using community.Mappers.ListSuggestions;
using community.Services;
using community.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace community.Controllers;

[ApiController]
[Route("api/user-lists")]
public class UserListsController : ControllerBase
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    private readonly GameListRequestService _gameListRequestService;
    private readonly UserService _userService;

    public UserListsController(
        IDbContextFactory<ApplicationDbContext> factory,
        GameListRequestService gameListRequestService,
        UserService userService)
    {
        _factory = factory;
        _gameListRequestService = gameListRequestService;
        _userService = userService;
    }

    [HttpGet("/api/users/{nickname}/lists")]
    public async Task<IActionResult> GetListsByUser(
        string nickname,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 9,
        [FromQuery] int maxPages = 5)
    {
        var user = _userService.GetByNickname(nickname);
        if (user is null)
        {
            return NotFound();
        }

        using var context = _factory.CreateDbContext();
        var totalItems = await context.GameLists.CountAsync(gameList =>
            gameList.ByUser && gameList.UserContributedId == user.Id);

        if (totalItems >= 10)
        {
            await _userService.GiveBadge(5, user.Id);
        }

        var pager = new Pager(totalItems, page, pageSize, maxPages);
        var lists = totalItems == 0
            ? new List<GameList>()
            : await context.GameLists
                .Include(gameList => gameList.FinalGameList)
                .Include(gameList => gameList.UserContributed)
                .Include(gameList => gameList.Items)
                .ThenInclude(item => item.Game)
                .Include(gameList => gameList.Source)
                .Where(gameList => gameList.ByUser && gameList.UserContributedId == user.Id)
                .Skip((pager.CurrentPage - 1) * pager.PageSize)
                .Take(pager.PageSize)
                .ToListAsync();

        return Ok(new GameListCollectionResponse(
            lists.Select(GameListMapper.ToGameListDto).ToList(),
            pager));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var list = await _gameListRequestService.GetUserGameListById(id);
        if (list is null)
        {
            return NotFound();
        }

        return Ok(GameListMapper.ToGameListDto(list));
    }

    [Authorize(Roles = "member,admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserListWriteRequest request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var gameListRequest = new GameListRequest
        {
            FinalGameListId = request.FinalGameListId,
            DateAdded = DateTime.UtcNow,
            Hidden = false,
            UserPostedId = user.Id,
            GameRequests = request.Games.Select(ListSuggestionMapper.ToEntity).ToList()
        };

        var response = await _gameListRequestService.CreateListForUser(gameListRequest);
        if (response.Success)
        {
            await _userService.GiveBadge(4, user.Id);
            return Ok(response);
        }

        return BadRequest(response);
    }

    [Authorize]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UserListWriteRequest request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var existing = await _gameListRequestService.GetUserGameListById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (existing.UserContributedId != user.Id && user.Role != "admin")
        {
            return Forbid();
        }

        var gameListRequest = new GameListRequest
        {
            FinalGameListId = request.FinalGameListId,
            DateAdded = DateTime.UtcNow,
            Hidden = false,
            GameRequests = request.Games.Select(ListSuggestionMapper.ToEntity).ToList()
        };

        var response = await _gameListRequestService.EditGameListForUser(id, gameListRequest);
        return response.Success ? Ok(response) : BadRequest(response);
    }

    [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        using var context = _factory.CreateDbContext();
        var gameList = await context.GameLists
            .Include(list => list.Items)
            .FirstOrDefaultAsync(list => list.Id == id);

        if (gameList is null)
        {
            return NotFound();
        }

        if (gameList.UserContributedId != user.Id && user.Role != "admin")
        {
            return Forbid();
        }

        context.Items.RemoveRange(gameList.Items);
        context.GameLists.Remove(gameList);
        await context.SaveChangesAsync();

        return NoContent();
    }
}
