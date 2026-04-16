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
    private readonly ILogger<AuthController> _logger;

    public AuthController(UserService userService, ILogger<AuthController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpGet("login")]
    [SwaggerOperation(
        Summary = "Google login (abrir no navegador)",
        Description = "Este endpoint redireciona para o Google e nao funciona pelo Swagger UI (CORS/redirect). Abra no navegador."
    )]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        _logger.LogInformation(
            "Google login challenge started. ReturnUrl={ReturnUrl} RequestPath={RequestPath}",
            DescribeReturnUrl(returnUrl),
            Request.Path);

        var authenticationProperties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Callback), values: new { returnUrl })
        };

        _logger.LogInformation(
            "Google login challenge prepared. Callback={Callback}",
            authenticationProperties.RedirectUri);

        return new ChallengeResult("Google", authenticationProperties);
    }

    [AllowAnonymous]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string? returnUrl = null, [FromQuery] string? remoteError = null)
    {
        var cleanUrl = CleanReturnUrl(returnUrl);
        _logger.LogInformation(
            "Google login callback received. ReturnUrl={ReturnUrl} CleanReturnUrl={CleanReturnUrl} HasRemoteError={HasRemoteError} IsAuthenticated={IsAuthenticated}",
            DescribeReturnUrl(returnUrl),
            DescribeReturnUrl(cleanUrl),
            !string.IsNullOrEmpty(remoteError),
            User.Identity?.IsAuthenticated ?? false);

        if (!string.IsNullOrEmpty(remoteError))
        {
            var reason = remoteError.Equals("access_denied", StringComparison.OrdinalIgnoreCase)
                ? "access_denied"
                : "provider_error";
            _logger.LogWarning(
                "Google login callback returned remote error. Reason={Reason} RemoteError={RemoteError}",
                reason,
                remoteError);
            return RedirectToAuthError(cleanUrl, reason);
        }

        var identity = User.Identities.FirstOrDefault();
        var needsFill = false;

        if (identity != null)
        {
            _logger.LogInformation(
                "Google login identity found. AuthenticationType={AuthenticationType} IsAuthenticated={IsAuthenticated} ClaimTypes={ClaimTypes}",
                identity.AuthenticationType,
                identity.IsAuthenticated,
                string.Join(",", identity.Claims.Select(claim => claim.Type).Distinct()));

            bool isBanned;
            (identity, needsFill, isBanned) = AssignCustomClaims(identity);

            if (isBanned)
            {
                _logger.LogWarning("Google login blocked because user is banned.");
                return RedirectToAuthError(cleanUrl, "banned");
            }

            if (identity.IsAuthenticated)
            {
                var authProperties = new AuthenticationProperties { IsPersistent = true };

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(identity),
                    authProperties);

                _logger.LogInformation(
                    "Google login cookie sign-in completed. NeedsFill={NeedsFill} Roles={Roles}",
                    needsFill,
                    string.Join(",", identity.Claims.Where(claim => claim.Type == ClaimTypes.Role).Select(claim => claim.Value)));
            }
        }

        if (identity == null || !identity.IsAuthenticated)
        {
            _logger.LogWarning("Google login callback failed because no authenticated identity was available.");
            return RedirectToAuthError(cleanUrl, "auth_failed");
        }

        if (needsFill)
        {
            _logger.LogInformation("Google login requires user profile completion. Redirecting to fill page.");
            if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out var fillUri))
            {
                var fillBase = $"{fillUri.Scheme}://{fillUri.Host}{(fillUri.IsDefaultPort ? "" : $":{fillUri.Port}")}{fillUri.AbsolutePath.TrimEnd('/')}";
                return Redirect($"{fillBase}#/users/fill");
            }
            return LocalRedirect("/users/fill");
        }

        if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out _))
        {
            _logger.LogInformation("Google login completed. Redirecting to absolute return URL {ReturnUrl}", DescribeReturnUrl(cleanUrl));
            return Redirect(cleanUrl);
        }

        _logger.LogInformation("Google login completed. Redirecting to local return URL {ReturnUrl}", DescribeReturnUrl(cleanUrl));
        return LocalRedirect(cleanUrl);
    }

    private IActionResult RedirectToAuthError(string cleanUrl, string reason)
    {
        _logger.LogInformation(
            "Redirecting to authentication error page. Reason={Reason} CleanReturnUrl={CleanReturnUrl}",
            reason,
            DescribeReturnUrl(cleanUrl));

        if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out var baseUri))
        {
            var baseUrl = $"{baseUri.Scheme}://{baseUri.Host}{(baseUri.IsDefaultPort ? "" : $":{baseUri.Port}")}{baseUri.AbsolutePath.TrimEnd('/')}";
            return Redirect($"{baseUrl}#/auth/error?reason={reason}");
        }
        return LocalRedirect($"/auth/error?reason={reason}");
    }

    [HttpGet("logout")]
    public async Task<IActionResult> Logout([FromQuery] string? returnUrl = null)
    {
        _logger.LogInformation("Logout requested. ReturnUrl={ReturnUrl}", DescribeReturnUrl(returnUrl));
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

    private (ClaimsIdentity user, bool needsFill, bool isBanned) AssignCustomClaims(ClaimsIdentity user)
    {
        try
        {
            var nameIdClaim = user.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier);
            if (nameIdClaim == null || string.IsNullOrWhiteSpace(nameIdClaim.Value))
            {
                _logger.LogWarning("Google login custom claims skipped because NameIdentifier claim is missing.");
                return (user, false, false);
            }

            var dbUser = _userService.GetByNameIdentifier(nameIdClaim.Value);
            _logger.LogInformation(
                "Google login user lookup completed. UserFound={UserFound} HasRole={HasRole} NeedsFill={NeedsFill} Banned={Banned}",
                dbUser != null,
                !string.IsNullOrEmpty(dbUser?.Role),
                dbUser?.NicknameIsNameIdentifier() ?? false,
                dbUser?.Banned ?? false);

            if (dbUser?.Banned == true)
                return (user, false, true);

            if (dbUser != null && !string.IsNullOrEmpty(dbUser.Role))
            {
                user.AddClaims(new[] { new Claim(ClaimTypes.Role, dbUser.Role) });
            }

            return (user, dbUser?.NicknameIsNameIdentifier() ?? false, false);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Google login custom claims failed.");
        }

        return (user, false, false);
    }

    private static readonly HashSet<string> AllowedReturnOrigins = new(StringComparer.OrdinalIgnoreCase)
    {
        "https://openvideogamedata.com",
        "https://www.openvideogamedata.com",
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
            _logger.LogError(e, "Failed to clean login return URL. ReturnUrl={ReturnUrl}", DescribeReturnUrl(returnUrl));
            return Url.Content("~/");
        }
    }

    private static string DescribeReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
            return "(empty)";

        if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
            return $"{uri.Scheme}://{uri.Host}{(uri.IsDefaultPort ? "" : $":{uri.Port}")}{uri.AbsolutePath}{uri.Fragment}";

        var queryStart = returnUrl.IndexOf('?');
        return queryStart >= 0 ? returnUrl[..queryStart] : returnUrl;
    }
}
