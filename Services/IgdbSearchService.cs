using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using community.Dtos;
using community.Dtos.Games;

namespace community.Services;

public class IgdbSearchService
{
    private const long OneYearUnix = 31556926;
    private const int DefaultPageSize = 15;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GameService _gameService;
    private readonly ILogger<IgdbSearchService> _logger;

    private readonly string _clientId;
    private readonly string _clientSecret;

    private string _accessToken = "";
    private DateTime _accessTokenExpiresAt = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    public IgdbSearchService(
        IHttpClientFactory httpClientFactory,
        GameService gameService,
        ILogger<IgdbSearchService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _gameService = gameService;
        _logger = logger;
        _clientId = Environment.GetEnvironmentVariable("IGDB_CLIENTID") ?? "";
        _clientSecret = Environment.GetEnvironmentVariable("IGDB_CLIENTSECRET") ?? "";
    }

    public async Task<IReadOnlyList<GameSearchResultDto>> SearchGamesAsync(string query, int pageSize = DefaultPageSize, string? slug = null)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Array.Empty<GameSearchResultDto>();
        }

        if (string.IsNullOrWhiteSpace(_clientId) || string.IsNullOrWhiteSpace(_clientSecret))
        {
            _logger.LogWarning("IGDB credentials are not configured.");
            return Array.Empty<GameSearchResultDto>();
        }

        var token = await GetAccessTokenAsync();
        if (string.IsNullOrWhiteSpace(token))
        {
            return Array.Empty<GameSearchResultDto>();
        }

        var (gameName, gameYearUnix) = ParseQuery(query);
        var offset = 0;
        var whereClause = gameYearUnix > 0
            ? $"; where first_release_date >= {gameYearUnix} & first_release_date < {gameYearUnix + OneYearUnix}"
            : "";
        var rawData = $"fields name, cover.url, cover.image_id, first_release_date, parent_game, category{whereClause}; search \"{EscapeIgdbString(gameName)}\"; offset {offset}; limit {pageSize};";

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.igdb.com/v4/games");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Headers.Add("Client-ID", _clientId);
            request.Content = new StringContent(rawData, Encoding.UTF8, "text/plain");

            using var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync();
            var returnedGames = await JsonSerializer.DeserializeAsync<List<GetGameApiReturn>>(stream) ?? new List<GetGameApiReturn>();

            returnedGames = returnedGames
                .OrderBy(x => x.FirstReleaseDate == 0)
                .ThenBy(x => x.FirstReleaseDate)
                .ToList();

            if (!string.IsNullOrWhiteSpace(slug))
            {
                var externalIds = returnedGames.Select(x => x.Id).ToList();
                var mostPickedGames = await _gameService.GetMostPickedGamesFromSlug(slug, externalIds);
                returnedGames = returnedGames
                    .OrderBy(x => !mostPickedGames.Contains(x.Id))
                    .ThenBy(x => x.FirstReleaseDate == 0)
                    .ThenBy(x => x.FirstReleaseDate)
                    .ToList();
            }

            return returnedGames.Select(MapToSearchResult).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search games on IGDB for query {Query}", query);
            return Array.Empty<GameSearchResultDto>();
        }
    }

    private async Task<string> GetAccessTokenAsync()
    {
        if (!string.IsNullOrWhiteSpace(_accessToken) && DateTime.UtcNow < _accessTokenExpiresAt)
        {
            return _accessToken;
        }

        await _tokenLock.WaitAsync();
        try
        {
            if (!string.IsNullOrWhiteSpace(_accessToken) && DateTime.UtcNow < _accessTokenExpiresAt)
            {
                return _accessToken;
            }

            var httpClient = _httpClientFactory.CreateClient();
            var values = new Dictionary<string, string>
            {
                { "client_id", _clientId },
                { "client_secret", _clientSecret },
                { "grant_type", "client_credentials" }
            };

            using var response = await httpClient.PostAsync("https://id.twitch.tv/oauth2/token", new FormUrlEncodedContent(values));
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync();
            var loginResult = await JsonSerializer.DeserializeAsync<LoginApiReturn>(stream);

            _accessToken = loginResult?.AccessToken ?? "";
            var expiresInSeconds = Math.Max(loginResult?.ExpiresIn ?? 0, 60);
            _accessTokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresInSeconds - 30);

            return _accessToken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authenticate with IGDB.");
            _accessToken = "";
            _accessTokenExpiresAt = DateTime.MinValue;
            return "";
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private GameSearchResultDto MapToSearchResult(GetGameApiReturn game)
    {
        var localGameId = _gameService.GetLocalGameIdByExternalId(game.Id);
        var releaseYear = game.FirstReleaseDate > 0
            ? DateTimeOffset.FromUnixTimeSeconds(game.FirstReleaseDate).UtcDateTime.Year
            : 0;

        return new GameSearchResultDto(
            localGameId,
            game.Id,
            game.Name,
            releaseYear,
            string.IsNullOrWhiteSpace(game.Cover?.ImageId)
                ? "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
                : $"https://images.igdb.com/igdb/image/upload/t_cover_big/{game.Cover.ImageId}.jpg",
            game.Cover?.ImageId,
            game.FirstReleaseDate);
    }

    private static (string GameName, long GameYearUnix) ParseQuery(string query)
    {
        if (!query.Contains(','))
        {
            return (query.Trim(), 0);
        }

        var parts = query.Split(',', 2);
        var gameName = parts[0];
        var gameYearText = parts[1].Trim();

        if (!int.TryParse(gameYearText, out var gameYear))
        {
            return (gameName, 0);
        }

        var dateTimeGameYear = new DateTime(gameYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var dateTimeOffsetGameYear = new DateTimeOffset(dateTimeGameYear);
        return (gameName, dateTimeOffsetGameYear.ToUnixTimeSeconds());
    }

    private static string EscapeIgdbString(string value)
    {
        return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
