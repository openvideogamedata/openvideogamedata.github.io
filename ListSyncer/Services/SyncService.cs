using ListSyncer.Models;
using Microsoft.Extensions.Logging;

namespace ListSyncer.Services;

public sealed class SyncService
{
    private readonly ApiClient _api;
    private readonly CacheService _cache;
    private readonly ILogger<SyncService> _logger;

    private int _created;
    private int _updated;
    private int _skipped;

    public SyncService(ApiClient api, CacheService cache, ILogger<SyncService> logger)
    {
        _api = api;
        _cache = cache;
        _logger = logger;
    }

    public async Task RunAsync()
    {
        _logger.LogInformation("Buscando categorias de listas...");
        var categories = await _api.GetAllCategoriesAsync();
        _logger.LogInformation("{Count} listas finais encontradas.", categories.Count);

        foreach (var category in categories)
        {
            await SyncFinalAsync(category);
            await SyncSourceListsAsync(category.Slug, byUser: false);
            await SyncSourceListsAsync(category.Slug, byUser: true);
        }

        _cache.WriteIndex(categories);
        Log("INDEX", "index.json", $"GRAVADO ({categories.Count} listas)");

        Console.WriteLine();
        Console.WriteLine($"Concluído: {_created} criado(s) | {_updated} atualizado(s) | {_skipped} ignorado(s)");
    }

    // ── Final list ────────────────────────────────────────────────────────────

    private async Task SyncFinalAsync(GameListCategoryDto category)
    {
        var slug = category.Slug;
        var existing = _cache.Read<GameListDetailsResponse>(CacheType.Final, slug);

        // Re-fetch if: file missing, old format (no FinalGameList), or source count changed
        bool needsFetch = existing is null
            || existing.Data?.FinalGameList is null
            || existing.TotalItems != category.NumberOfSources;

        if (!needsFetch)
        {
            Log("FINAL", slug, "OK");
            _skipped++;
            return;
        }

        var details = await _api.GetListBySlugAsync(slug);
        if (details is null)
        {
            Log("FINAL", slug, "ERRO (sem resposta da API)");
            return;
        }

        bool isUpdate = existing?.Data?.FinalGameList is not null;
        _cache.Write(new CacheFile<GameListDetailsResponse>
        {
            SyncedAt = DateTime.UtcNow,
            Slug = slug,
            Type = CacheType.Final,
            TotalItems = category.NumberOfSources,
            Data = details
        });

        if (isUpdate)
        {
            Log("FINAL", slug, $"ATUALIZADO ({existing!.TotalItems} → {category.NumberOfSources} fontes)");
            _updated++;
        }
        else
        {
            Log("FINAL", slug, "CRIADO");
            _created++;
        }
    }

    // ── Critic / User lists ───────────────────────────────────────────────────

    private async Task SyncSourceListsAsync(string slug, bool byUser)
    {
        var type = byUser ? CacheType.User : CacheType.Critic;
        var label = byUser ? "USER" : "CRITIC";

        if (!_cache.Exists(type, slug))
        {
            await CreateSourceCacheAsync(slug, type, byUser, label);
            return;
        }

        // Fast-check: one request to get TotalItems from Pager (COUNT(*) on the DB).
        // The backend has no OrderBy on this query, so DateAdded of page-1 item is meaningless.
        // Count is the only reliable staleness signal available without changing the API.
        var existing = _cache.Read<List<GameListDto>>(type, slug);
        var totalInApi = await _api.GetTotalItemsAsync(slug, byUser);

        if (totalInApi == 0 && existing?.TotalItems == 0)
        {
            Log(label, slug, "OK (sem listas)");
            _skipped++;
            return;
        }

        if (existing?.TotalItems == totalInApi)
        {
            Log(label, slug, "OK");
            _skipped++;
            return;
        }

        // Count changed — fetch full data and overwrite
        await CreateSourceCacheAsync(slug, type, byUser, label, isUpdate: true,
            previousTotal: existing?.TotalItems ?? 0, currentTotal: totalInApi);
    }

    private async Task CreateSourceCacheAsync(
        string slug, CacheType type, bool byUser, string label,
        bool isUpdate = false, int previousTotal = 0, int currentTotal = 0)
    {
        var (lists, total) = await _api.GetAllListsBySlugAsync(slug, byUser);

        _cache.Write(new CacheFile<List<GameListDto>>
        {
            SyncedAt = DateTime.UtcNow,
            Slug = slug,
            Type = type,
            TotalItems = total,
            Data = lists
        });

        var status = isUpdate
            ? $"ATUALIZADO ({previousTotal} → {currentTotal} listas)"
            : $"CRIADO ({lists.Count} listas)";

        Log(label, slug, status);

        if (isUpdate) _updated++; else _created++;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void Log(string label, string slug, string status)
    {
        var time = DateTime.Now.ToString("HH:mm:ss");
        Console.WriteLine($"[{time}] [{label,-6}] {slug,-40} → {status}");
    }
}
