using community.Dtos;

namespace community.Dtos.Trackers;

public sealed record TrackFilterDto(
    TrackStatus TrackStatus,
    int TrackStatusCount);

public sealed record TrackerComparisonResponse(
    string Slug,
    TrackerStatsViewModel UserStats,
    TrackerStatsViewModel VisitorStats,
    int TopWinnersCount);

public sealed record TrackerListOptionDto(
    long Id,
    string Title);

public sealed record TrackerListYearOptionDto(
    long Id,
    int? Year);
