using community.Dtos.Badges;

namespace community.Mappers.Badges;

public static class BadgeMapper
{
    public static BadgeDto ToDto(Badge badge)
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
