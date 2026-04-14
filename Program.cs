using community.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OAuth;
using community.Services;
using community.Middlewares;

namespace community
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            ConfigureServices(builder);
            var app = builder.Build();
            Configure(app);
            app.Run();
        }

        private static void ConfigureServices(WebApplicationBuilder builder)
        {
            var connectionString = Environment.GetEnvironmentVariable("PGSQL_CONNECTION");
            var googleClientId = Environment.GetEnvironmentVariable("GOOGLEAUTH_CLIENTID");
            var googleClientSecret = Environment.GetEnvironmentVariable("GOOGLEAUTH_CLIENTSECRET");

            builder.Services.AddDbContextFactory<ApplicationDbContext>(options =>
                options.UseNpgsql(connectionString), ServiceLifetime.Transient);

            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    policy.WithOrigins(
                            "http://localhost:5173",
                            "https://localhost:5173",
                            "http://localhost:5124",
                            "http://www.openvideogamedata.com",
                            "http://openvideogamedata.com",
                            "https://localhost:5124",
                            "https://openvideogamedata.herokuapp.com",
                            "https://openvideogamedata.onrender.com",
                            "https://www.openvideogamedata.com",
                            "https://openvideogamedata.com",
                            "https://openvideogamedata.github.io")
                        .WithMethods("OPTIONS", "PUT", "DELETE", "GET", "POST")
                        .AllowAnyHeader()
                        .AllowCredentials();
                });
            });

            builder.Services.AddRazorPages();
            builder.Services.AddServerSideBlazor();
            builder.Services.AddControllers();
            builder.Services.AddSingleton<GameService>();
            builder.Services.AddSingleton<UserService>();
            builder.Services.AddSingleton<GameListRequestService>();
            builder.Services.AddSingleton<ItemService>();
            builder.Services.AddSingleton<GameListService>();
            builder.Services.AddSingleton<TrackerService>();

            builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.CookieManager = new ChunkingCookieManager();
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SameSite = SameSiteMode.None;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.Events = new CookieAuthenticationEvents
                    {
                        OnRedirectToLogin = context =>
                        {
                            if (IsApiRequest(context.Request.Path))
                            {
                                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                                return Task.CompletedTask;
                            }

                            context.Response.Redirect(context.RedirectUri);
                            return Task.CompletedTask;
                        },
                        OnRedirectToAccessDenied = context =>
                        {
                            if (IsApiRequest(context.Request.Path))
                            {
                                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                                return Task.CompletedTask;
                            }

                            context.Response.Redirect(context.RedirectUri);
                            return Task.CompletedTask;
                        }
                    };
                })
                .AddGoogle(googleOptions =>
                {
                    googleOptions.ClientId = googleClientId ?? "";
                    googleOptions.ClientSecret = googleClientSecret ?? "";
                    googleOptions.ClaimActions.MapJsonKey("urn:google:profile", "link");
                    googleOptions.ClaimActions.MapJsonKey("urn:google:image", "picture");
                    googleOptions.Events = new OAuthEvents
                    {
                        OnRedirectToAuthorizationEndpoint = context =>
                        {
                            var logger = context.HttpContext.RequestServices
                                .GetRequiredService<ILoggerFactory>()
                                .CreateLogger("GoogleAuth");

                            logger.LogInformation(
                                "Redirecting to Google authorization endpoint. Path={Path} ReturnUrl={ReturnUrl}",
                                context.Request.Path,
                                context.Properties?.RedirectUri);

                            context.Response.Redirect(context.RedirectUri);
                            return Task.CompletedTask;
                        },
                        OnCreatingTicket = context =>
                        {
                            var logger = context.HttpContext.RequestServices
                                .GetRequiredService<ILoggerFactory>()
                                .CreateLogger("GoogleAuth");

                            logger.LogInformation(
                                "Google ticket created. HasAccessToken={HasAccessToken} ClaimTypes={ClaimTypes}",
                                !string.IsNullOrEmpty(context.AccessToken),
                                string.Join(",", context.Principal?.Claims.Select(claim => claim.Type).Distinct() ?? Array.Empty<string>()));

                            return Task.CompletedTask;
                        },
                        OnRemoteFailure = context =>
                        {
                            var logger = context.HttpContext.RequestServices
                                .GetRequiredService<ILoggerFactory>()
                                .CreateLogger("GoogleAuth");

                            logger.LogWarning(
                                context.Failure,
                                "Google remote authentication failed. Error={Error} ErrorDescription={ErrorDescription} Path={Path}",
                                context.Request.Query["error"].ToString(),
                                context.Request.Query["error_description"].ToString(),
                                context.Request.Path);

                            return Task.CompletedTask;
                        }
                    };
                });

            builder.Services.AddHttpContextAccessor();
            builder.Services.AddHttpClient();
            builder.Services.AddScoped<HttpClient>();

            builder.Services.AddLocalization(options =>
            {
                options.ResourcesPath = "Resources";
            });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.EnableAnnotations();
            });
        }

        private static void Configure(WebApplication app)
        {
            var supportedCultures = new[] { "en-US", "pt-BR" };
            var localizationOptions = new RequestLocalizationOptions()
                .AddSupportedCultures(supportedCultures)
                .AddSupportedUICultures(supportedCultures);

            app.UseRequestLocalization(localizationOptions);
            app.UseHttpsRedirection();

            if (!app.Environment.IsDevelopment())
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            app.Use((context, next) =>
            {
                context.Request.Scheme = "https";
                return next(context);
            });

            app.UseStaticFiles();
            app.UseRouting();
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1");
                options.RoutePrefix = "swagger";
            });

            app.UseCors();
            app.UseCookiePolicy();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseMiddleware<UserInfoMiddleware>();

            app.MapControllers();
            app.MapGet("/api/hello", () => Results.Ok("hello world"));
            app.MapGet("/swagger", () => Results.Redirect("/swagger/index.html", permanent: false));
            app.MapBlazorHub();
            app.MapFallbackToPage("/_Host");
        }

        private static bool IsApiRequest(PathString path)
        {
            return path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
        }
    }
}
