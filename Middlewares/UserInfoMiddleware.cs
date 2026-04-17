using community.Services;

namespace community.Middlewares;

public sealed class UserInfoMiddleware
{
    private readonly UserService _userService;
    private readonly RequestDelegate _next;

    public UserInfoMiddleware(UserService userService, RequestDelegate next)
    {
        _userService = userService;
        _next = next;
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
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - UserInfoMiddleware {e.Message}\n{e}");
        }

        await _next(context);
    }
}
