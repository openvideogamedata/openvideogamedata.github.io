using community.Dtos.Friends;
using community.Mappers.Friends;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[Authorize]
[ApiController]
[Route("api/friends")]
public class FriendsController : ControllerBase
{
    private readonly UserService _userService;

    public FriendsController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetFriends()
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var friends = await _userService.GetFriends(user.Id);
        if (friends.Any())
        {
            await _userService.GiveBadge(9, user.Id);
        }

        return Ok(friends.Select(FriendMapper.ToFriendDto).ToList());
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests()
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var received = await _userService.GetFriendRequests(user.Id);
        var sent = await _userService.GetFriendRequestsSent(user.Id);
        var friends = await _userService.GetFriends(user.Id);

        return Ok(new FriendsResponse(
            friends.Select(FriendMapper.ToFriendDto).ToList(),
            received.Select(FriendMapper.ToRequestDto).ToList(),
            sent.Select(FriendMapper.ToRequestDto).ToList()));
    }

    [HttpPost("requests/{friendshipId:long}/accept")]
    public async Task<IActionResult> Accept(long friendshipId)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var requests = await _userService.GetFriendRequests(user.Id);
        var friendship = requests.FirstOrDefault(x => x.FriendshipId == friendshipId);

        await _userService.AcceptFriendRequest(friendshipId);
        await _userService.GiveBadge(9, user.Id);

        if (friendship?.Requester is not null)
        {
            await _userService.SendNotification($"{user.FullName} accepted your friend request!", friendship.Requester.Id);
            await _userService.GiveBadge(9, friendship.Requester.Id);
        }

        return NoContent();
    }

    [HttpDelete("requests/{friendshipId:long}")]
    public async Task<IActionResult> RemoveRequest(long friendshipId)
    {
        await _userService.RemoveFriendship(friendshipId);
        return NoContent();
    }

    [HttpDelete("{friendshipId:long}")]
    public async Task<IActionResult> RemoveFriend(long friendshipId)
    {
        await _userService.RemoveFriendship(friendshipId);
        return NoContent();
    }
}
