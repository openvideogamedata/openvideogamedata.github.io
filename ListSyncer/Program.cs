using ListSyncer.Config;
using ListSyncer.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureAppConfiguration(cfg =>
    {
        cfg.SetBasePath(AppContext.BaseDirectory);
        cfg.AddJsonFile("appsettings.json", optional: false, reloadOnChange: false);
    })
    .ConfigureServices((ctx, services) =>
    {
        services.Configure<AppSettings>(ctx.Configuration);

        services.AddHttpClient<ApiClient>((sp, client) =>
        {
            var settings = sp.GetRequiredService<IOptions<AppSettings>>().Value;
            client.BaseAddress = new Uri(settings.Api.BaseUrl.TrimEnd('/') + "/");
        });

        services.AddSingleton<CacheService>();
        services.AddTransient<SyncService>();
    })
    .Build();

Console.WriteLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Iniciando sincronização...");
Console.WriteLine();

var syncer = host.Services.GetRequiredService<SyncService>();

try
{
    await syncer.RunAsync();
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Erro fatal: {ex.Message}");
    return 1;
}

return 0;
