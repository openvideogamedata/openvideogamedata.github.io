using Serilog;
using Serilog.Debugging;
using Serilog.Sinks.Grafana.Loki;

namespace community.Services;

public static class LoggingConfiguration
{
    public const string AppName = "openvgd-api";

    public static Serilog.ILogger CreateLogger()
    {
        var lokiUrl = Environment.GetEnvironmentVariable("LOKI_URL") ?? "";
        var lokiUser = Environment.GetEnvironmentVariable("LOKI_USER") ?? "";
        var lokiPass = Environment.GetEnvironmentVariable("LOKI_PASSWORD") ?? "";
        var environmentName = GetEnvironmentName();

        if (IsSelfLogEnabled())
        {
            SelfLog.Enable(message => Console.Error.WriteLine($"[SERILOG-SELFLOG] {message}"));
        }

        var loggerConfig = new LoggerConfiguration()
            .MinimumLevel.Information()
            .Enrich.FromLogContext()
            .WriteTo.Console();

        if (!string.IsNullOrWhiteSpace(lokiUrl))
        {
            loggerConfig.WriteTo.GrafanaLoki(
                lokiUrl,
                credentials: new LokiCredentials { Login = lokiUser, Password = lokiPass },
                labels:
                [
                    new LokiLabel { Key = "app", Value = AppName },
                    new LokiLabel { Key = "service_name", Value = AppName },
                    new LokiLabel { Key = "environment", Value = environmentName }
                ]);
        }

        return loggerConfig.CreateLogger();
    }

    public static void LogStartupConfiguration()
    {
        var lokiUrl = Environment.GetEnvironmentVariable("LOKI_URL") ?? "";

        Log.Information(
            "Logger configured. Loki enabled: {LokiEnabled}. Environment: {Environment}. Loki host: {LokiHost}",
            !string.IsNullOrWhiteSpace(lokiUrl),
            GetEnvironmentName(),
            SafeHostForLogs(lokiUrl));
    }

    private static bool IsSelfLogEnabled()
    {
        return string.Equals(
            Environment.GetEnvironmentVariable("LOKI_SELFLOG"),
            "true",
            StringComparison.OrdinalIgnoreCase);
    }

    private static string GetEnvironmentName()
    {
        return Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? "Production";
    }

    private static string SafeHostForLogs(string lokiUrl)
    {
        if (string.IsNullOrWhiteSpace(lokiUrl))
            return "disabled";

        return Uri.TryCreate(lokiUrl, UriKind.Absolute, out var uri)
            ? uri.Host
            : "invalid";
    }
}
