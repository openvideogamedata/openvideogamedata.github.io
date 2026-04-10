namespace community.Dtos.Badges;

public sealed record BadgeDto(
    long Id,
    string Name,
    string Description,
    string[]? PixelArt,
    int Priority,
    bool AutomaticallyGiven);

public sealed record BadgesResponse(
    List<BadgeDto> Badges,
    List<BadgeDto> UserBadges,
    bool IsAdmin);

public sealed record CreateBadgeRequest(
    string Name,
    string Description,
    string PixelArt,
    bool AutomaticallyGiven,
    int Priority);

public sealed record UpdateBadgeRequest(
    string Name,
    string Description,
    string PixelArt,
    bool AutomaticallyGiven,
    int Priority);

public sealed record UpdateBadgePixelArtRequest(string[]? PixelArt);

public sealed record BadgeUserBindingRequest(
    long UserId,
    bool NotifyUser = true);

public sealed record RedeemBadgePromoRequest(string Code);
