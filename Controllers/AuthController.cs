using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using community.Data;
using community.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore.Annotations;

namespace community.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserService _userService;
    private readonly ILogger<AuthController> _logger;
    private readonly IDbContextFactory<ApplicationDbContext> _dbFactory;
    private readonly string _googleClientId;
    private readonly string _jwtSecret;

    public AuthController(UserService userService, ILogger<AuthController> logger, IDbContextFactory<ApplicationDbContext> dbFactory)
    {
        _userService = userService;
        _logger = logger;
        _dbFactory = dbFactory;
        _googleClientId =
            Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ??
            Environment.GetEnvironmentVariable("GOOGLEAUTH_CLIENTID") ??
            throw new InvalidOperationException("GOOGLE_CLIENT_ID or GOOGLEAUTH_CLIENTID is not set.");
        _jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? throw new InvalidOperationException("JWT_SECRET is not set.");
    }

    [AllowAnonymous]
    [HttpPost("google")]
    [SwaggerOperation(Summary = "Login with Google", Description = "Validates the ID Token issued by Google Identity Services and returns a signed JWT.")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest req)
    {
        var idToken = req.IdToken ?? req.Credential;
        if (string.IsNullOrWhiteSpace(idToken))
        {
            _logger.LogWarning(
                "Google login request rejected because no id token was provided. HasIdToken={HasIdToken} HasCredential={HasCredential}",
                !string.IsNullOrWhiteSpace(req.IdToken),
                !string.IsNullOrWhiteSpace(req.Credential));
            return BadRequest(new { error = "id_token_missing" });
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { _googleClientId } });
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("Google ID token validation failed: {Message}", ex.Message);
            return Unauthorized(new { error = "Token Google invalido." });
        }

        var user = _userService.GetOrCreateFromGooglePayload(
            nameIdentifier: payload.Subject,
            givenName: payload.GivenName ?? payload.Name ?? "",
            surname: payload.FamilyName ?? "");

        if (user.Banned)
        {
            _logger.LogWarning("Banned user attempted login. NameIdentifier={NameIdentifier}", payload.Subject);
            return StatusCode(403, new { error = "banned" });
        }

        var token = GenerateJwt(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);

        _logger.LogInformation("Login successful. NameIdentifier={NameIdentifier} NeedsFill={NeedsFill}", payload.Subject, user.NicknameIsNameIdentifier());

        return Ok(new
        {
            token,
            refreshToken = refreshToken.Token,
            needsFill = user.NicknameIsNameIdentifier()
        });
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    [SwaggerOperation(Summary = "Renews the JWT using a valid refresh token.")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return BadRequest(new { error = "refresh_token_missing" });

        using var context = _dbFactory.CreateDbContext();

        var stored = await context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == req.RefreshToken);

        if (stored is null || !stored.IsActive)
        {
            _logger.LogWarning("Refresh token invalid or expired.");
            return Unauthorized(new { error = "invalid_refresh_token" });
        }

        if (stored.User.Banned)
            return StatusCode(403, new { error = "banned" });

        stored.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = new RefreshToken
        {
            Token = GenerateSecureToken(),
            UserId = stored.UserId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        };

        context.RefreshTokens.Add(newRefreshToken);
        await context.SaveChangesAsync();

        var jwt = GenerateJwt(stored.User);

        return Ok(new
        {
            token = jwt,
            refreshToken = newRefreshToken.Token,
        });
    }

    [Authorize]
    [HttpPost("logout")]
    [SwaggerOperation(Summary = "Revokes the refresh token, ending the session.")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return BadRequest(new { error = "refresh_token_missing" });

        using var context = _dbFactory.CreateDbContext();

        var stored = await context.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == req.RefreshToken);

        if (stored is not null && stored.IsActive)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [SwaggerOperation(Summary = "Returns basic data of the authenticated user from the JWT.")]
    public IActionResult Me()
    {
        var nameIdentifier = User.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier)?.Value;
        return Ok(new
        {
            isAuthenticated = true,
            nameIdentifier,
            name = User.Identity?.Name,
            roles = User.Claims.Where(x => x.Type == ClaimTypes.Role).Select(x => x.Value).ToList()
        });
    }

    private async Task<RefreshToken> CreateRefreshTokenAsync(long userId)
    {
        using var context = _dbFactory.CreateDbContext();

        var refreshToken = new RefreshToken
        {
            Token = GenerateSecureToken(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        };

        context.RefreshTokens.Add(refreshToken);
        await context.SaveChangesAsync();

        return refreshToken;
    }

    private static string GenerateSecureToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));


    private string GenerateJwt(User user)
    {
        var claims = new List<Claim>
        {
            new Claim("sub", user.NameIdentifier),
            new Claim(ClaimTypes.Name, user.GivenName ?? ""),
        };

        if (!string.IsNullOrEmpty(user.Role))
            claims.Add(new Claim(ClaimTypes.Role, user.Role));

        if (user.IsMember)
            claims.Add(new Claim(ClaimTypes.Role, "member"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var token = new JwtSecurityToken(
            issuer: "openvideogamedata-api",
            audience: "openvideogamedata-client",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public sealed class GoogleLoginRequest
{
    public string? IdToken { get; set; }
    public string? Credential { get; set; }
}

public sealed class RefreshRequest
{
    public string? RefreshToken { get; set; }
}
