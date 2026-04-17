namespace community.Middlewares;

public sealed class ExceptionLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionLoggingMiddleware> _logger;

    public ExceptionLoggingMiddleware(RequestDelegate next, ILogger<ExceptionLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var user = context.User.Identity?.Name ?? "anonymous";
            var query = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : "";

            _logger.LogError(ex,
                "Unhandled exception | {Method} {Path}{Query} | User: {User} | IP: {IP} | {ExceptionType}: {ExceptionMessage}",
                context.Request.Method,
                context.Request.Path,
                query,
                user,
                context.Connection.RemoteIpAddress,
                ex.GetType().Name,
                ex.Message);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
        }
    }
}
