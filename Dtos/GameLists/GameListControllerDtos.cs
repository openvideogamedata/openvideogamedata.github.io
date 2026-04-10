using community.Data;
using community.Dtos;

namespace community.Dtos.GameLists;

public sealed record GameListCategoryDto(
    long Id,
    string Title,
    int? Year,
    int NumberOfGames,
    int NumberOfSources,
    string Slug,
    bool Pinned,
    List<TopWinnerDto> TopWinners);

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
    List<SourceListDto> SimilarLists);

public sealed record GameListDetailsResponse(
    FinalGameListDetailsDto FinalGameList,
    List<TopWinnerDto> TopWinnersByCritics,
    TrackerStatsViewModel TrackerStatsCritics,
    List<TopWinnerDto> TopWinnersByUsers,
    TrackerStatsViewModel TrackerStatsUsers,
    List<SourceListDto> Sources,
    double NumberOfUsersLists,
    List<ContributorDto> Contributors);

public sealed record GameListCollectionResponse(
    List<GameListDto> Lists,
    object Pager);

public sealed record GameListDto(
    long Id,
    bool ByUser,
    string? SourceListUrl,
    DateTime DateAdded,
    DateTime? DateLastUpdated,
    UserSummaryDto? UserContributed,
    SourceDto? Source,
    FinalGameListSummaryDto? FinalGameList,
    List<GameListItemDto> Items);

public sealed record GameListItemDto(
    long Id,
    int Position,
    string GameTitle,
    long GameId,
    string? CoverImageUrl,
    int Score);

public sealed record TopWinnerDto(
    long GameId,
    string GameTitle,
    TrackStatus TrackStatus,
    int Citations,
    int PorcentageOfCitations,
    DateTime FirstReleaseDate,
    int ReleaseYear,
    string CoverImageUrl,
    int Score,
    int Position,
    long GameListId,
    long? FinalGameListId);

public sealed record SourceListDto(
    string SourceName,
    string SourceUrl,
    DateTime? SourceDateLastUpdated,
    int? Year);

public sealed record SourceDto(
    long Id,
    string Name,
    string HostUrl);

public sealed record UserSummaryDto(
    long Id,
    string Nickname,
    string FullName);

public sealed record FinalGameListSummaryDto(
    long Id,
    string Title,
    int? Year,
    string Slug,
    string FullName);

public sealed record ContributorDto(
    long UserContributedId,
    string FullName,
    string Nickname,
    int NumberOfContributions,
    int PorcentageOfContributions);

public sealed record UpdateAvgConsiderationRequest(bool ConsideredForAvgScore);
