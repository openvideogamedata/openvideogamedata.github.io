using community.Dtos.Badges;
using community.Mappers.Badges;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/badges")]
public class BadgesController : ControllerBase
{
    private readonly UserService _userService;

    public BadgesController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetBadges()
    {
        var allBadges = await _userService.GetAllBadges();
        var user = _userService.GetLoggedUser();
        var isAdmin = user?.Role == "admin";
        var visibleBadges = isAdmin ? allBadges : allBadges.Where(x => x.AutomaticallyGiven).ToList();
        var userBadges = user is null ? new List<Badge>() : await _userService.GetBadges(user.Id);

        return Ok(new BadgesResponse(
            visibleBadges.Select(BadgeMapper.ToDto).ToList(),
            userBadges.Select(BadgeMapper.ToDto).ToList(),
            isAdmin));
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBadgeRequest request)
    {
        await _userService.CreateBadge(request.Name, request.Description, request.PixelArt, request.AutomaticallyGiven, request.Priority);
        return Ok();
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateBadgeRequest request)
    {
        await _userService.UpdateBadge(id, request.Name, request.Description, request.PixelArt, request.AutomaticallyGiven, request.Priority);
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:long}/pixel-art")]
    public async Task<IActionResult> UpdatePixelArt(long id, [FromBody] UpdateBadgePixelArtRequest request)
    {
        var badges = await _userService.GetAllBadges();
        var badge = badges.FirstOrDefault(x => x.Id == id);
        if (badge is null)
        {
            return NotFound();
        }

        var updated = await _userService.UpdateBadgePixelArt(request.PixelArt, badge);
        return updated ? NoContent() : BadRequest();
    }

    [Authorize(Roles = "admin")]
    [HttpPost("{id:long}/assign")]
    public async Task<IActionResult> Assign(long id, [FromBody] BadgeUserBindingRequest request)
    {
        await _userService.GiveBadge(id, request.UserId, request.NotifyUser);
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id:long}/assign/{userId:long}")]
    public async Task<IActionResult> Unassign(long id, long userId)
    {
        await _userService.RemoveBadge(id, userId);
        return NoContent();
    }

    [Authorize]
    [HttpPost("promo/redeem")]
    public async Task<IActionResult> RedeemPromo([FromBody] RedeemBadgePromoRequest request)
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        var semanaPosBgs = new DateTime(2023, 10, 22);
        var valid = request.Code.ToLowerInvariant() == "bgs23open" && DateTime.Now.Date < semanaPosBgs;
        if (!valid)
        {
            return BadRequest(new { success = false, reason = "Codigo invalido." });
        }

        await _userService.GiveBadge(11, user.Id);
        return Ok(new { success = true });
    }
}
