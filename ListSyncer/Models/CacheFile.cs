namespace ListSyncer.Models;

public enum CacheType { Final, Critic, User }

public sealed class CacheFile<T>
{
    /// <summary>When this file was last written.</summary>
    public DateTime SyncedAt { get; set; }

    public string Slug { get; set; } = string.Empty;
    public CacheType Type { get; set; }
    public int TotalItems { get; set; }
    public T? Data { get; set; }
}
