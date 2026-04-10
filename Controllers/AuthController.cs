using System.Security.Claims;
using community.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace community.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserService _userService;

    public AuthController(UserService userService)
    {
        _userService = userService;
    }

    [AllowAnonymous]
    [HttpGet("login")]
    [SwaggerOperation(
        Summary = "Google login (abrir no navegador)",
        Description = "Este endpoint redireciona para o Google e nao funciona pelo Swagger UI (CORS/redirect). Abra no navegador."
    )]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        var authenticationProperties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Callback), values: new { returnUrl })
        };

        return new ChallengeResult("Google", authenticationProperties);
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string? returnUrl = null, [FromQuery] string? remoteError = null)
    {
        var cleanUrl = CleanReturnUrl(returnUrl);
        var identity = User.Identities.FirstOrDefault();
        var needsFill = false;

        if (identity != null)
        {
            (identity, needsFill) = AssignCustomClaims(identity);

            if (identity.IsAuthenticated)
            {
                var authProperties = new AuthenticationProperties
                {
                    IsPersistent = true,
                    RedirectUri = Request.Host.Value
                };

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(identity),
                    authProperties);
            }
        }

        if (needsFill)
        {
            // Redirect to fill page on the correct frontend (React or local)
            if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out var fillUri))
            {
                var fillBase = $"{fillUri.Scheme}://{fillUri.Host}{(fillUri.IsDefaultPort ? "" : $":{fillUri.Port}")}{fillUri.AbsolutePath.TrimEnd('/')}";
                return Redirect($"{fillBase}#/users/fill");
            }
            return LocalRedirect("/users/fill");
        }

        if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out _))
            return Redirect(cleanUrl);

        return LocalRedirect(cleanUrl);
    }

    [HttpGet("logout")]
    public async Task<IActionResult> Logout([FromQuery] string? returnUrl = null)
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        var cleanUrl = CleanReturnUrl(returnUrl);
        if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out _))
            return Redirect(cleanUrl);
        return LocalRedirect(cleanUrl);
    }

    [AllowAnonymous]
    [HttpGet("session")]
    public IActionResult Session()
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        if (!isAuthenticated)
        {
            return Ok(new { isAuthenticated });
        }

        var nameIdentifier = User.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier)?.Value;
        return Ok(new
        {
            isAuthenticated,
            nameIdentifier,
            name = User.Identity?.Name,
            roles = User.Claims.Where(x => x.Type == ClaimTypes.Role).Select(x => x.Value).ToList()
        });
    }

    private (ClaimsIdentity user, bool needsFill) AssignCustomClaims(ClaimsIdentity user)
    {
        try
        {
            var nameIdClaim = user.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier);
            if (nameIdClaim == null || string.IsNullOrWhiteSpace(nameIdClaim.Value))
            {
                return (user, false);
            }

            var dbUser = _userService.GetByNameIdentifier(nameIdClaim.Value);
            if (dbUser != null && !string.IsNullOrEmpty(dbUser.Role))
            {
                user.AddClaims(new[] { new Claim(ClaimTypes.Role, dbUser.Role) });
            }

            return (user, dbUser?.NicknameIsNameIdentifier() ?? false);
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - AssignCustomClaims - exception: {e}");
        }

        return (user, false);
    }

    private static readonly HashSet<string> AllowedReturnOrigins = new(StringComparer.OrdinalIgnoreCase)
    {
        "https://openvideogamedata.github.io",
        "https://localhost:5124",
        "http://localhost:5173",
        "https://localhost:5173",
    };

    private string CleanReturnUrl(string? returnUrl)
    {
        try
        {
            if (!string.IsNullOrEmpty(returnUrl))
            {
                // Allow absolute redirects back to trusted frontend origins
                if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
                {
                    var origin = $"{uri.Scheme}://{uri.Host}{(uri.IsDefaultPort ? "" : $":{uri.Port}")}";
                    if (AllowedReturnOrigins.Contains(origin))
                        return returnUrl;
                }

                var normalized = returnUrl[0] == '/' ? returnUrl : $"/{returnUrl}";
                return Url.Content($"~{normalized}");
            }

            return Url.Content("~/");
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - CleanReturnUrl - {e}");
            return Url.Content("~/");
        }
    }
}
