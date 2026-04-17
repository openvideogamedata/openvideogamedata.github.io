using community.Configuration;
using community.Services;
using Serilog;

namespace community
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Log.Logger = LoggingConfiguration.CreateLogger();

            try
            {
                var builder = WebApplication.CreateBuilder(args);
                builder.Host.UseSerilog();
                LoggingConfiguration.LogStartupConfiguration();
                builder.AddApplicationServices();

                var app = builder.Build();
                app.UseApplicationPipeline();
                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Application failed to start");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }

    }
}
