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

// ── /api/game-lists/{slug} ────────────────────────────────────────────────────
// Fields we don't compute locally are kept as object — JSON passes through as-is.

public sealed record GameListDetailsResponse(
    FinalGameListDetailsDto FinalGameList,
    List<object> TopWinnersByCritics,
    object? TrackerStatsCritics,
    List<object> TopWinnersByUsers,
    object? TrackerStatsUsers,
    List<object> Sources,
    double NumberOfUsersLists,
    List<object> Contributors);

public sealed record FinalGameListDetailsDto(
    long Id,
    string Title,
    int? Year,
    string Slug,
    string FullName,
    string? SocialUrl,
    int SocialComments,
    string Tags,
    List<string> TagList,
    bool ConsideredForAvgScore,
    bool Pinned,
    List<object> SimilarLists);

// ── Shared ───────────────────────────────────────────────────────────────────

public sealed record PagerDto(
    int TotalItems,
    int CurrentPage,
    int PageSize,
    int TotalPages);
