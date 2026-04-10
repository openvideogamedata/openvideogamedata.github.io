using community.Dtos.GameLists;

namespace community.Dtos.ListSuggestions;

public sealed record GameRequestDto(
    long Id,
    int Position,
    string GameTitle,
    long GameId,
    string? FirstReleaseDate);

public sealed record GameRequestInput(
    int Position,
    string GameTitle,
    long GameId,
    string? FirstReleaseDate);

public sealed record GameListRequestDto(
    long Id,
    string SourceListUrl,
    string SourceName,
    string HostUrl,
    long FinalGameListId,
    FinalGameListSummaryDto? FinalGameList,
    long Score,
    DateTime DateAdded,
    long UserPostedId,
    UserSummaryDto? UserPosted,
    bool Hidden,
    int Likes,
    int Dislikes,
    List<GameRequestDto> Games);

public sealed record CreateGameListRequestInput(
    string SourceListUrl,
    long FinalGameListId,
    List<GameRequestInput> Games);

public sealed record VoteResponse(bool Success);

public sealed record VisibilityRequest(bool Visible);
