using community.Dtos;

namespace community.Dtos.Users;

public sealed record UserSummaryDto(
    long Id,
    string Nickname,
    string FullName,
    string[]? UserPicture,
    int Contributions);

public sealed record UserAdminDto(
    long Id,
    string NameIdentifier,
    string GivenName,
    string Surname,
    string Nickname,
    string FullName,
    string? Role,
    bool Banned,
    string? BanReason,
    int Contributions);

public sealed record UserProfileDto(
    long Id,
    string Nickname,
    string FullName,
    string[]? UserPicture,
    bool IsLoggedUser,
    bool HasNotifications,
    bool AlreadyFriend,
    bool AlreadyRequestedFriend,
    bool LoadedFriendship,
    GamificationDto? Gamification);

public sealed record GamificationDto(
    int Karma,
    int Contributions,
    string TopList,
    string TopListSlug,
    int Rank,
    List<BadgeDto> Badges);

public sealed record BadgeDto(
    long Id,
    string Name,
    string Description,
    string[]? PixelArt,
    int Priority,
    bool AutomaticallyGiven);

public sealed record UsersSearchResponse(
    List<UserSummaryDto> Users,
    object Pager,
    GeneralFilters Filters);

public sealed record UpdateNicknameRequest(string Nickname);

public sealed record UpdatePixelArtRequest(string[]? PixelArt);

public sealed record ToggleBanRequest(bool Banned);

public sealed record NicknameAvailabilityResponse(
    string Nickname,
    bool Available);
