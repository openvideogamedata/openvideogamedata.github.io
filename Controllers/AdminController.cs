using community.Data;
using community.Dtos.Admin;
using community.Dtos.Users;
using community.Mappers.Users;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Authorize(Roles = "admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly GameListService _gameListService;
    private readonly UserService _userService;

    public AdminController(GameListService gameListService, UserService userService)
    {
        _gameListService = gameListService;
        _userService = userService;
    }

    [HttpGet("stats")]
    public IActionResult GetStats()
    {
        var (totalGameLists, totalUsers) = _gameListService.GetTotalNumberOfGameListAndUsers();
        return Ok(new AdminStatsDto(totalGameLists, totalUsers));
    }

    [HttpPost("top-winners/regenerate")]
    public IActionResult RegenerateTopWinners()
    {
        _gameListService.GenerateAllTopWinners();
        return Accepted(new MasterListRegenerationResponse(true, "Regeneracao de top winners iniciada."));
    }

    [HttpGet("users")]
    public IActionResult GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? search = null)
    {
        var (users, pager) = _userService.GetAll(page, pageSize, maxPages, search ?? "");
        return Ok(new AdminUsersResponse(
            users.Select(UserMapper.ToAdminDto).ToList(),
            pager));
    }

    [HttpPut("users/{nameIdentifier}/ban")]
    public async Task<IActionResult> ToggleBan(string nameIdentifier, [FromBody] ToggleBanRequest request)
    {
        var user = _userService.GetByNameIdentifier(nameIdentifier);
        if (user is null)
        {
            return NotFound();
        }

        await _userService.ToggleBan(nameIdentifier, request.Banned);
        return NoContent();
    }
}
