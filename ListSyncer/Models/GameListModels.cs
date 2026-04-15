namespace ListSyncer.Models;

// ── /api/game-lists/categories ───────────────────────────────────────────────

public sealed record CategoryPageResponse(
    List<GameListCategoryDto> Lists,
    PagerDto Pager,
    object? Filters);

public sealed record GameListCategoryDto(
    long Id,
    string Title,
    int? Year,
    int NumberOfGames,
    int NumberOfSources,
    string Slug,
    bool Pinned,
    List<string> TagList,
    List<object> TopWinners);

// ── /api/game-lists/{slug}/critic-lists  &  /user-lists ─────────────────────

public sealed record GameListCollectionResponse(
    List<GameListDto> Lists,
    PagerDto Pager);

public sealed record GameListDto(
    long Id,
    bool ByUser,
    string? SourceListUrl,
    DateTime DateAdded,
    DateTime? DateLastUpdated,
    object? UserContributed,
    object? Source,
    object? FinalGameList,
    List<object> Items);

// ── Shared ───────────────────────────────────────────────────────────────────

public sealed record PagerDto(
    int TotalItems,
    int CurrentPage,
    int PageSize,
    int TotalPages);
