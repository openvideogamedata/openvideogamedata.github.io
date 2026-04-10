using community.Dtos;
using community.Dtos.Users;
using community.Mappers.Users;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    [Authorize]
    [HttpGet]
    public IActionResult GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? search = null)
    {
        var filters = new GeneralFilters(page, pageSize, maxPages, search ?? "");
        var (users, pager) = _userService.GetAll(filters.Page, filters.PageSize, filters.MaxPages, filters.SearchedText);

        return Ok(new UsersSearchResponse(
            users.Select(UserMapper.ToSummaryDto).ToList(),
            pager,
            filters));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var gamification = await _userService.GetGamificationValues(user);
        return Ok(UserMapper.ToProfileDto(
            user,
            isLoggedUser: true,
            hasNotifications: _userService.LoggedUserHasAnyNotifications(),
            alreadyFriend: false,
            alreadyRequestedFriend: false,
            loadedFriendship: false,
            gamification));
    }

    [HttpGet("{nickname}")]
    public async Task<IActionResult> GetByNickname(string nickname)
    {
        var user = _userService.GetByNickname(nickname);
        if (user is null)
        {
            return NotFound();
        }

        var loggedUserNameIdentifier = _userService.GetLoggedUserNameIdentifier();
        var isLoggedUser = loggedUserNameIdentifier == user.NameIdentifier;
        var hasNotifications = isLoggedUser && _userService.LoggedUserHasAnyNotifications();
        var alreadyFriend = true;
        var alreadyRequestedFriend = false;
        var loadedFriendship = false;

        if (!isLoggedUser)
        {
            var visitor = _userService.GetLoggedUser();
            if (visitor is not null)
            {
                alreadyFriend = await _userService.AreFriends(visitor.Id, user.Id);
                alreadyRequestedFriend = await _userService.HavePendingFriendship(visitor.Id, user.Id);
                loadedFriendship = true;
            }
        }

        var gamification = await _userService.GetGamificationValues(user);
        return Ok(UserMapper.ToProfileDto(
            user,
            isLoggedUser,
            hasNotifications,
            alreadyFriend,
            alreadyRequestedFriend,
            loadedFriendship,
            gamification));
    }

    [Authorize]
    [HttpGet("nickname-availability")]
    public async Task<IActionResult> CheckNicknameAvailability([FromQuery] string nickname)
    {
        var available = await _userService.NicknameIsAvailable(nickname);
        return Ok(new NicknameAvailabilityResponse(nickname, available));
    }

    [Authorize]
    [HttpPut("me/nickname")]
    public async Task<IActionResult> UpdateMyNickname([FromBody] UpdateNicknameRequest request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var available = await _userService.NicknameIsAvailable(request.Nickname);
        if (!available)
        {
            return BadRequest(new { success = false, reason = "Nickname indisponivel." });
        }

        await _userService.UpdateNickname(request.Nickname, user);
        var updatedUser = _userService.GetByNickname(request.Nickname);

        return Ok(updatedUser is null ? null : UserMapper.ToSummaryDto(updatedUser));
    }

    [Authorize]
    [HttpPut("me/pixel-art")]
    public async Task<IActionResult> UpdateMyPixelArt([FromBody] UpdatePixelArtRequest request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var updated = await _userService.UpdatePixelArt(request.PixelArt, user);
        if (!updated)
        {
            return BadRequest(new { success = false, reason = "Nao foi possivel atualizar o pixel art." });
        }

        return NoContent();
    }

    [Authorize]
    [HttpPost("{nickname}/friend-requests")]
    public async Task<IActionResult> AddFriend(string nickname)
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

        if (visitor.Id == user.Id)
        {
            return BadRequest(new { success = false, reason = "Nao e possivel adicionar voce mesmo." });
        }

        var alreadyFriend = await _userService.AreFriends(visitor.Id, user.Id);
        var alreadyRequestedFriend = await _userService.HavePendingFriendship(visitor.Id, user.Id);
        if (alreadyFriend || alreadyRequestedFriend)
        {
            return Conflict(new { success = false, reason = "Amizade ja existe ou esta pendente." });
        }

        await _userService.AddFriend(visitor.Id, user.Id);
        await _userService.SendNotification($"{visitor.FullName} sent you a friend request.", user.Id);

        return Accepted();
    }

    [Authorize]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMyAccount()
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        await _userService.DeleteAccount(user.Id);
        return NoContent();
    }

    [HttpGet("top-contributors")]
    public async Task<IActionResult> GetTopContributors()
    {
        var users = await _userService.GetTopContributors();
        return Ok(users.Select(UserMapper.ToSummaryDto).ToList());
    }

    [Authorize(Roles = "admin")]
    [HttpGet("admin")]
    public IActionResult GetUsersForAdmin(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5,
        [FromQuery] string? search = null)
    {
        var (users, pager) = _userService.GetAll(page, pageSize, maxPages, search ?? "");

        return Ok(new
        {
            users = users.Select(UserMapper.ToAdminDto).ToList(),
            pager
        });
    }

    [Authorize(Roles = "admin")]
    [HttpPut("admin/{nameIdentifier}/ban")]
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
