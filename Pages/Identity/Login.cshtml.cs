using community.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Security.Claims;

namespace community.Pages.Identity
{
    [AllowAnonymous]
    public sealed class LoginModel : PageModel
    {
        private static readonly HashSet<string> AllowedReturnOrigins = new(StringComparer.OrdinalIgnoreCase)
        {
            "http://openvideogamedata.com",
            "http://www.openvideogamedata.com",
            "https://openvideogamedata.com",
            "https://www.openvideogamedata.com",
            "https://openvideogamedata.github.io",
            "https://localhost:5124",
            "http://localhost:5173",
            "https://localhost:5173",
        };

        private readonly UserService _userService;
        private readonly ILogger<LoginModel> _logger;

        public LoginModel(UserService userService, ILogger<LoginModel> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        public IActionResult OnGetAsync(string returnUrl = null)
        {
            string provider = "Google";
            _logger.LogInformation(
                "Legacy Google login challenge started. ReturnUrl={ReturnUrl} RequestPath={RequestPath}",
                DescribeReturnUrl(returnUrl),
                Request.Path);

            // Request a redirect to the external login provider.
            var authenticationProperties = new AuthenticationProperties
            {
                RedirectUri = Url.Page("./Login",
                    pageHandler: "Callback",
                    values: new { returnUrl }),
            };

            _logger.LogInformation(
                "Legacy Google login challenge prepared. Callback={Callback}",
                authenticationProperties.RedirectUri);

            return new ChallengeResult(provider, authenticationProperties);
        }

        public async Task<IActionResult> OnGetCallbackAsync(string returnUrl = null, string remoteError = null)
        {
            _logger.LogInformation(
                "Legacy Google login callback received. ReturnUrl={ReturnUrl} HasRemoteError={HasRemoteError} IsAuthenticated={IsAuthenticated}",
                DescribeReturnUrl(returnUrl),
                !string.IsNullOrEmpty(remoteError),
                User.Identity?.IsAuthenticated ?? false);

            if (!string.IsNullOrEmpty(remoteError))
            {
                _logger.LogWarning("Legacy Google login callback returned remote error. RemoteError={RemoteError}", remoteError);
                return LocalRedirect("/");
            }

            returnUrl = CleanReturnUrl(returnUrl);
            var LoggedUser = this.User.Identities.FirstOrDefault();
            var needsFill = false;

            if (LoggedUser != null)
            {
                _logger.LogInformation(
                    "Legacy Google login identity found. AuthenticationType={AuthenticationType} IsAuthenticated={IsAuthenticated} ClaimTypes={ClaimTypes}",
                    LoggedUser.AuthenticationType,
                    LoggedUser.IsAuthenticated,
                    string.Join(",", LoggedUser.Claims.Select(claim => claim.Type).Distinct()));

                (LoggedUser, needsFill) = AsignCustomClaims(LoggedUser);
            }

            if (LoggedUser?.IsAuthenticated == true)
            {
                var authProperties = new AuthenticationProperties
                {
                    IsPersistent = true,
                    RedirectUri = this.Request.Host.Value
                };
                await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(LoggedUser),
                authProperties);

                _logger.LogInformation(
                    "Legacy Google login cookie sign-in completed. NeedsFill={NeedsFill} Roles={Roles}",
                    needsFill,
                    string.Join(",", LoggedUser.Claims.Where(claim => claim.Type == ClaimTypes.Role).Select(claim => claim.Value)));
            }
            else
            {
                _logger.LogWarning("Legacy Google login callback failed because no authenticated identity was available.");
                return LocalRedirect("/");
            }

            if (needsFill)
            {
                _logger.LogInformation("Legacy Google login requires user profile completion. Redirecting to fill page.");
                if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var fillUri))
                {
                    var fillBase = $"{fillUri.Scheme}://{fillUri.Host}{(fillUri.IsDefaultPort ? "" : $":{fillUri.Port}")}{fillUri.AbsolutePath.TrimEnd('/')}";
                    return Redirect($"{fillBase}#/users/fill");
                }
                return LocalRedirect("/users/fill");
            }

            _logger.LogInformation("Legacy Google login completed. Redirecting to {ReturnUrl}", DescribeReturnUrl(returnUrl));
            if (Uri.TryCreate(returnUrl, UriKind.Absolute, out _))
                return Redirect(returnUrl);
            return LocalRedirect(returnUrl);
        }
        
        private (ClaimsIdentity user, bool needsFill) AsignCustomClaims(ClaimsIdentity User)
        {
            try
            {
                var nameIdClaim = User.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier);
                if (nameIdClaim == null || string.IsNullOrWhiteSpace(nameIdClaim.Value))
                {
                    _logger.LogWarning("Legacy Google login custom claims skipped because NameIdentifier claim is missing.");
                    return (User, false);
                }

                var dbUser = _userService.GetByNameIdentifier(nameIdClaim.Value);
                _logger.LogInformation(
                    "Legacy Google login user lookup completed. UserFound={UserFound} HasRole={HasRole} NeedsFill={NeedsFill}",
                    dbUser != null,
                    !string.IsNullOrEmpty(dbUser?.Role),
                    dbUser?.NicknameIsNameIdentifier() ?? false);

                if (!string.IsNullOrEmpty(dbUser?.Role))
                    (User! as ClaimsIdentity).AddClaims(
                        new[] { new Claim(ClaimTypes.Role, dbUser.Role) });

                return (User, dbUser?.NicknameIsNameIdentifier() ?? false);
            }
            catch(Exception e)
            {
                _logger.LogError(e, "Legacy Google login custom claims failed.");
            }
            return (User, false);
        }

        private string CleanReturnUrl(string returnUrl)
        {
            try
            {
                if (!string.IsNullOrEmpty(returnUrl))
                {
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
            catch(Exception e)
            {
                _logger.LogError(e, "Failed to clean legacy login return URL. ReturnUrl={ReturnUrl}", DescribeReturnUrl(returnUrl));
                return Url.Content("~/");
            }
        }

        private static string DescribeReturnUrl(string returnUrl)
        {
            if (string.IsNullOrWhiteSpace(returnUrl))
                return "(empty)";

            if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
                return $"{uri.Scheme}://{uri.Host}{(uri.IsDefaultPort ? "" : $":{uri.Port}")}{uri.AbsolutePath}";

            var queryStart = returnUrl.IndexOf('?');
            return queryStart >= 0 ? returnUrl[..queryStart] : returnUrl;
        }
    }
}
