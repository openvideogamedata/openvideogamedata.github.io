using community.Data;

namespace community.Dtos.Games;

public sealed record UpdateGameTrackerRequest(
    TrackStatus Status,
    string? Note,
    DateTime? StatusDate,
    bool Platinum);

public sealed record GameSummaryDto(
    long Id,
    string Title,
    DateTime FirstReleaseDate,
    int ReleaseYear,
    string? ExternalCoverImageId,
    string CoverImageUrl,
    string CoverBigImageUrl,
    long NumberOfLists,
    int? Score,
    TrackerDto? Tracker);

public sealed record GameDetailsDto(
    long Id,
    string Title,
    DateTime FirstReleaseDate,
    int ReleaseYear,
    long ExternalId,
    string? ExternalCoverImageId,
    string CoverImageUrl,
    string CoverBigImageUrl,
    int Score);

public sealed record CitationDto(
    long Id,
    int Position,
    int Score,
    long GameListId,
    string? SourceListUrl,
    string? SourceName,
    long? FinalGameListId,
    string? FinalGameListName,
    string? FinalGameListSlug);

public sealed record TrackerDto(
    long Id,
    long UserId,
    long GameId,
    TrackStatus Status,
    DateTime StatusDate,
    DateTime LastUpdateDate,
    string? Note,
    bool Platinum);

public sealed record FriendTrackerDto(
    TrackerDto Tracker,
    FriendUserDto? User);

public sealed record FriendUserDto(
    long Id,
    string Nickname,
    string FullName,
    string[]? UserPicture);
