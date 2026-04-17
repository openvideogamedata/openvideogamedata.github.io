using community.Services;

namespace community.Middlewares;

public sealed class UserInfoMiddleware
{
    private readonly UserService _userService;
    private readonly RequestDelegate _next;
    private readonly ILogger<UserInfoMiddleware> _logger;

    public UserInfoMiddleware(UserService userService, RequestDelegate next, ILogger<UserInfoMiddleware> logger)
    {
        _userService = userService;
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            if (_userService.IsLogged())
            {
                if (_userService.UserIsBanned(_userService.GetLoggedUserNameIdentifier()))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { error = "banned" });
                    return;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UserInfoMiddleware");
        }

        await _next(context);
    }
}
