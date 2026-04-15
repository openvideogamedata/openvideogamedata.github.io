using System.Text.Json;
using ListSyncer.Config;
using ListSyncer.Models;
using Microsoft.Extensions.Options;

namespace ListSyncer.Services;

public sealed class CacheService
{
    private readonly string _root;

    private static readonly JsonSerializerOptions WriteOpts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly JsonSerializerOptions ReadOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public CacheService(IOptions<AppSettings> options)
    {
        _root = Path.GetFullPath(options.Value.Paths.ListsRoot);
        Directory.CreateDirectory(Path.Combine(_root, "final"));
        Directory.CreateDirectory(Path.Combine(_root, "critic"));
        Directory.CreateDirectory(Path.Combine(_root, "user"));
    }

    public string FilePath(CacheType type, string slug) =>
        Path.Combine(_root, type.ToString().ToLowerInvariant(), $"{slug}.json");

    public bool Exists(CacheType type, string slug) =>
        File.Exists(FilePath(type, slug));

    public CacheFile<T>? Read<T>(CacheType type, string slug)
    {
        var path = FilePath(type, slug);
        if (!File.Exists(path)) return null;

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<CacheFile<T>>(json, ReadOpts);
    }

    public void Write<T>(CacheFile<T> cache)
    {
        var path = FilePath(cache.Type, cache.Slug);
        var json = JsonSerializer.Serialize(cache, WriteOpts);
        File.WriteAllText(path, json);
    }

    public void WriteIndex(List<GameListCategoryDto> categories)
    {
        var payload = new
        {
            syncedAt = DateTime.UtcNow,
            data = categories
        };
        var path = Path.Combine(_root, "index.json");
        File.WriteAllText(path, JsonSerializer.Serialize(payload, WriteOpts));
    }
}
