using community.Data;

namespace community.Dtos.Users;

public sealed record UserDashboardDto(
    UserDashboardProfileDto Profile,
    List<UserDashboardStatDto> Stats,
    List<UserDashboardChecklistItemDto> Checklist,
    List<UserDashboardActionDto> Actions,
    List<UserDashboardActivityDto> RecentActivity);

public sealed record UserDashboardProfileDto(
    long Id,
    string Nickname,
    string FullName,
    string[]? UserPicture,
    bool NeedsNickname,
    int UnreadNotifications,
    int FriendsCount,
    int PendingFriendRequests,
    int BadgesCount,
    int TotalTrackers,
    int ListsCreated);

public sealed record UserDashboardStatDto(
    string Label,
    string Value,
    string Hint,
    string Href);

public sealed record UserDashboardChecklistItemDto(
    string Key,
    string Title,
    string Description,
    string Href,
    bool Completed);

public sealed record UserDashboardActionDto(
    string Title,
    string Description,
    string Href,
    string Tone);

public sealed record UserDashboardActivityDto(
    string Type,
    string Title,
    string Description,
    string Href,
    DateTime Date);
