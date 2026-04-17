using System.Text;
using community.Data;
using community.Dtos;
using community.Middlewares;
using community.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Sinks.Grafana.Loki;

namespace community
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var lokiUrl  = Environment.GetEnvironmentVariable("LOKI_URL") ?? "";
            var lokiUser = Environment.GetEnvironmentVariable("LOKI_USER") ?? "";
            var lokiPass = Environment.GetEnvironmentVariable("LOKI_PASSWORD") ?? "";

            var loggerConfig = new LoggerConfiguration()
                .MinimumLevel.Information()
                .Enrich.FromLogContext()
                .WriteTo.Console();

            if (!string.IsNullOrEmpty(lokiUrl))
            {
                loggerConfig.WriteTo.GrafanaLoki(
                    lokiUrl,
                    credentials: new LokiCredentials { Login = lokiUser, Password = lokiPass },
                    labels: [new LokiLabel { Key = "app", Value = "openvgd-api" }]);
            }

            Log.Logger = loggerConfig.CreateLogger();

            try
            {
                var builder = WebApplication.CreateBuilder(args);
                builder.Host.UseSerilog();
                ConfigureServices(builder);
                var app = builder.Build();
                Configure(app);
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

        private static void ConfigureServices(WebApplicationBuilder builder)
        {
            var connectionString = Environment.GetEnvironmentVariable("PGSQL_CONNECTION");
            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? throw new InvalidOperationException("JWT_SECRET is not set.");

            builder.Services.AddDbContextFactory<ApplicationDbContext>(options =>
                options.UseNpgsql(connectionString), ServiceLifetime.Transient);

            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    var origins = new List<string>
                    {
                        "https://openvideogamedata.github.io",
                        "https://openvideogamedata.com",
                        "https://www.openvideogamedata.com",
                    };

                    if (builder.Environment.IsDevelopment())
                        origins.Add("http://localhost:5173");

                    policy.WithOrigins(origins.ToArray())
                          .WithMethods("OPTIONS", "PUT", "DELETE", "GET", "POST")
                          .AllowAnyHeader();
                });
            });

            builder.Services.AddControllers();
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Values
                        .SelectMany(entry => entry.Errors)
                        .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                            ? error.Exception?.Message
                            : error.ErrorMessage)
                        .Where(message => !string.IsNullOrWhiteSpace(message))
                        .Cast<string>()
                        .Distinct()
                        .ToList();

                    var reason = errors.Count > 0
                        ? string.Join(" ", errors)
                        : "The submitted data is invalid.";

                    return new BadRequestObjectResult(new ResponseToPage(false, reason));
                };
            });

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.MapInboundClaims = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = "openvideogamedata-api",
                        ValidateAudience = true,
                        ValidAudience = "openvideogamedata-client",
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
                    };
                });

            builder.Services.AddSingleton<GameService>();
            builder.Services.AddSingleton<UserService>();
            builder.Services.AddSingleton<GameListRequestService>();
            builder.Services.AddSingleton<ItemService>();
            builder.Services.AddSingleton<GameListService>();
            builder.Services.AddSingleton<TrackerService>();
            builder.Services.AddSingleton<IgdbSearchService>();

            builder.Services.AddHttpContextAccessor();
            builder.Services.AddHttpClient();
            builder.Services.AddScoped<HttpClient>();

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.EnableAnnotations();
            });

            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });
        }

        private static void Configure(WebApplication app)
        {
            app.UseForwardedHeaders();
            app.UseMiddleware<ExceptionLoggingMiddleware>();

            if (app.Environment.IsDevelopment())
                app.UseHttpsRedirection();
            else
                app.UseHsts();

            app.UseRouting();
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
                options.RoutePrefix = "swagger";
            });

            app.UseCors();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseMiddleware<UserInfoMiddleware>();

            app.MapControllers();
            app.MapGet("/api/hello", () => Results.Ok("hello world"));
            app.MapGet("/swagger", () => Results.Redirect("/swagger/index.html", permanent: false));
        }
    }
}
