using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using community.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore.Annotations;

namespace community.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserService _userService;
    private readonly ILogger<AuthController> _logger;
    private readonly string _googleClientId;
    private readonly string _jwtSecret;

    public AuthController(UserService userService, ILogger<AuthController> logger)
    {
        _userService = userService;
        _logger = logger;
        _googleClientId =
            Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ??
            Environment.GetEnvironmentVariable("GOOGLEAUTH_CLIENTID") ??
            throw new InvalidOperationException("GOOGLE_CLIENT_ID or GOOGLEAUTH_CLIENTID is not set.");
        _jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? throw new InvalidOperationException("JWT_SECRET is not set.");
    }

    [AllowAnonymous]
    [HttpPost("google")]
    [SwaggerOperation(Summary = "Login com Google", Description = "Valida o ID Token emitido pelo Google Identity Services e retorna um JWT proprio.")]
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
        _logger.LogInformation("Login successful. NameIdentifier={NameIdentifier} NeedsFill={NeedsFill}", payload.Subject, user.NicknameIsNameIdentifier());

        return Ok(new
        {
            token,
            needsFill = user.NicknameIsNameIdentifier()
        });
    }

    [Authorize]
    [HttpGet("me")]
    [SwaggerOperation(Summary = "Retorna dados basicos do usuario autenticado a partir do JWT.")]
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

    private string GenerateJwt(User user)
    {
        var claims = new List<Claim>
        {
            // "sub" mapeia para ClaimTypes.NameIdentifier via MapInboundClaims=true no JWT Bearer
            new Claim("sub", user.NameIdentifier),
            new Claim(ClaimTypes.Name, user.GivenName ?? ""),
        };

        if (!string.IsNullOrEmpty(user.Role))
            claims.Add(new Claim(ClaimTypes.Role, user.Role));

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
