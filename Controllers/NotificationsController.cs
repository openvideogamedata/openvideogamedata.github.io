using community.Dtos.Notifications;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly UserService _userService;

    public NotificationsController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public IActionResult GetNotifications([FromQuery] bool markAsRead = false)
    {
        var user = _userService.GetLoggedUserWithNotifications(markAsRead);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(user.Notifications?
            .OrderByDescending(x => x.DateAdded)
            .Select(x => new NotificationDto(x.Id, x.Message, x.Read, x.DateAdded))
            .ToList() ?? new List<NotificationDto>());
    }

    [HttpPost("read-all")]
    public IActionResult ReadAll()
    {
        var user = _userService.GetLoggedUserWithNotifications(readNotifications: true);
        return user is null ? Unauthorized() : NoContent();
    }
}
