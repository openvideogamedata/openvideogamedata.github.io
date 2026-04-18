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

namespace community.Configuration;

public static class ApplicationSetupExtensions
{
    public static WebApplicationBuilder AddApplicationServices(this WebApplicationBuilder builder)
    {
        var connectionString = Environment.GetEnvironmentVariable("PGSQL_CONNECTION");
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET is not set.");

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
        builder.Services.AddSingleton<MembershipService>();

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

        return builder;
    }

    public static WebApplication UseApplicationPipeline(this WebApplication app)
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

        return app;
    }
}
