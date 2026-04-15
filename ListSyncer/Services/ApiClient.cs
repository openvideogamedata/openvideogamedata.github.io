using System.Net.Http.Json;
using System.Text.Json;
using ListSyncer.Config;
using ListSyncer.Models;
using Microsoft.Extensions.Options;

namespace ListSyncer.Services;

public sealed class ApiClient
{
    private readonly HttpClient _http;
    private readonly int _pageSize;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiClient(HttpClient http, IOptions<AppSettings> options)
    {
        _http = http;
        _pageSize = options.Value.Api.PageSize;
    }

    /// <summary>Fetches every page of /api/game-lists/categories.</summary>
    public async Task<List<GameListCategoryDto>> GetAllCategoriesAsync()
    {
        var all = new List<GameListCategoryDto>();
        int page = 1;

        while (true)
        {
            var url = $"api/game-lists/categories?page={page}&pageSize={_pageSize}&maxPages=999";
            var response = await _http.GetFromJsonAsync<CategoryPageResponse>(url, JsonOpts);

            if (response?.Lists is null || response.Lists.Count == 0)
                break;

            all.AddRange(response.Lists);

            if (page >= (response.Pager?.TotalPages ?? 1))
                break;

            page++;
        }

        return all;
    }

    /// <summary>
    /// Returns the total number of lists for a slug from the API.
    /// Uses Pager.TotalItems which is a COUNT(*) on the DB — reliable regardless of ordering.
    /// </summary>
    public async Task<int> GetTotalItemsAsync(string slug, bool byUser)
    {
        var segment = byUser ? "user-lists" : "critic-lists";
        var url = $"api/game-lists/{slug}/{segment}?page=1&pageSize=1&maxPages=1";

        var response = await _http.GetFromJsonAsync<GameListCollectionResponse>(url, JsonOpts);
        return response?.Pager?.TotalItems ?? 0;
    }

    /// <summary>Fetches every page of critic or user lists for a given slug.</summary>
    public async Task<(List<GameListDto> Lists, int Total)> GetAllListsBySlugAsync(
        string slug, bool byUser)
    {
        var all = new List<GameListDto>();
        var segment = byUser ? "user-lists" : "critic-lists";
        int page = 1;
        int totalItems = 0;

        while (true)
        {
            var url = $"api/game-lists/{slug}/{segment}?page={page}&pageSize={_pageSize}&maxPages=999";
            var response = await _http.GetFromJsonAsync<GameListCollectionResponse>(url, JsonOpts);

            if (response?.Lists is null || response.Lists.Count == 0)
                break;

            all.AddRange(response.Lists);
            totalItems = response.Pager?.TotalItems ?? all.Count;

            if (page >= (response.Pager?.TotalPages ?? 1))
                break;

            page++;
        }

        return (all, totalItems);
    }
}
