namespace ListSyncer.Config;

public sealed class AppSettings
{
    public ApiSettings Api { get; set; } = new();
    public PathSettings Paths { get; set; } = new();
}

public sealed class ApiSettings
{
    public string BaseUrl { get; set; } = "https://localhost:5001";
    public int PageSize { get; set; } = 50;
}

public sealed class PathSettings
{
    public string ListsRoot { get; set; } = "../lists";
}
