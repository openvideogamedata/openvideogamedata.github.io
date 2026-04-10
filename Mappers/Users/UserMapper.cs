using community.Dtos.Users;

namespace community.Mappers.Users;

public static class UserMapper
{
    public static UserSummaryDto ToSummaryDto(User user)
    {
        return new UserSummaryDto(
            user.Id,
            user.Nickname,
            user.FullName,
            user.GetUserPicture(),
            user.GameListsContributed?.Count ?? 0);
    }

    public static UserAdminDto ToAdminDto(User user)
    {
        return new UserAdminDto(
            user.Id,
            user.NameIdentifier,
            user.GivenName,
            user.Surname,
            user.Nickname,
            user.FullName,
            user.Role,
            user.Banned,
            user.BanReason,
            user.GameListsContributed?.Count ?? 0);
    }

    public static UserProfileDto ToProfileDto(
        User user,
        bool isLoggedUser,
        bool hasNotifications,
        bool alreadyFriend,
        bool alreadyRequestedFriend,
        bool loadedFriendship,
        GamificationValues? gamification)
    {
        return new UserProfileDto(
            user.Id,
            user.Nickname,
            user.FullName,
            user.GetUserPicture(),
            isLoggedUser,
            hasNotifications,
            alreadyFriend,
            alreadyRequestedFriend,
            loadedFriendship,
            gamification is null ? null : ToGamificationDto(gamification));
    }

    private static GamificationDto ToGamificationDto(GamificationValues gamification)
    {
        return new GamificationDto(
            gamification.Karma,
            gamification.Contributions,
            gamification.TopList,
            gamification.TopListSlug,
            gamification.Rank,
            gamification.Badges.Select(ToBadgeDto).ToList());
    }

    private static BadgeDto ToBadgeDto(Badge badge)
    {
        return new BadgeDto(
            badge.Id,
            badge.Name,
            badge.Description,
            badge.GetPixelArt(),
            badge.Priority,
            badge.AutomaticallyGiven);
    }
}
