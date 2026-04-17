using community.Dtos;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/membership")]
public sealed class MembershipController : ControllerBase
{
    private readonly MembershipService _membershipService;
    private readonly UserService _userService;
    private readonly ILogger<MembershipController> _logger;

    public MembershipController(
        MembershipService membershipService,
        UserService userService,
        ILogger<MembershipController> logger)
    {
        _membershipService = membershipService;
        _userService = userService;
        _logger = logger;
    }

    [Authorize]
    [HttpPost("checkout-session")]
    public async Task<IActionResult> CreateCheckoutSession()
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        try
        {
            var session = await _membershipService.CreateCheckoutSession(user);
            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ResponseToPage(false, ex.Message));
        }
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult GetMyMembership()
    {
        var user = _userService.GetLoggedUser();
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(_membershipService.GetStatus(user));
    }

    [AllowAnonymous]
    [HttpPost("stripe/webhook")]
    public async Task<IActionResult> StripeWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();

        try
        {
            await _membershipService.ProcessStripeWebhook(payload, signature);
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Stripe webhook rejected: {Message}", ex.Message);
            return BadRequest(new ResponseToPage(false, ex.Message));
        }
    }
}
