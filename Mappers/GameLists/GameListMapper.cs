using community.Data;
using community.Dtos.GameLists;

namespace community.Mappers.GameLists;

public static class GameListMapper
{
    public static GameListCategoryDto ToCategoryDto(FinalGameList list)
    {
        return new GameListCategoryDto(
            list.Id,
            list.Title,
            list.Year,
            list.NumberOfGames,
            list.NumberOfSources,
            list.Slug,
            list.Pinned,
            SplitTags(list.Tags),
            list.TopThreeWinners.Select(ToTopWinnerDto).ToList());
    }

    public static FinalGameListDetailsDto ToDetailsDto(FinalGameList list)
    {
        return new FinalGameListDetailsDto(
            list.Id,
            list.Title,
            list.Year,
            list.Slug,
            list.GetFullName(),
            list.SocialUrl,
            list.SocialComments,
            list.Tags,
            SplitTags(list.Tags),
            list.ConsideredForAvgScore,
            list.Pinned,
            list.PinnedPriority,
            list.SimilarLists?.Select(ToSourceListDto).ToList() ?? new List<SourceListDto>());
    }

    public static GameListDto ToGameListDto(GameList gameList)
    {
        return new GameListDto(
            gameList.Id,
            gameList.ByUser,
            gameList.SourceListUrl,
            gameList.DateAdded,
            gameList.DateLastUpdated,
            gameList.UserContributed is null ? null : ToUserSummaryDto(gameList.UserContributed),
            gameList.Source is null ? null : ToSourceDto(gameList.Source),
            gameList.FinalGameList is null ? null : ToFinalGameListSummaryDto(gameList.FinalGameList),
            gameList.Items?.OrderBy(item => item.Position).Select(ToGameListItemDto).ToList() ?? new List<GameListItemDto>());
    }

    public static TopWinnerDto ToTopWinnerDto(GroupItem winner)
    {
        return new TopWinnerDto(
            winner.GameId,
            winner.GameTitle,
            winner.TrackStatus,
            winner.Citations,
            winner.PorcentageOfCitations,
            winner.FirstReleaseDate,
            winner.FirstReleaseDate.Year,
            winner.CoverImageUrl,
            winner.Score,
            winner.Position,
            winner.GameListId,
            winner.FinalGameListId);
    }

    public static SourceListDto ToSourceListDto(SourceList source)
    {
        return new SourceListDto(
            source.SourceName,
            source.SourceUrl,
            source.SourceDateLastUpdated,
            source.Year);
    }

    public static ContributorDto ToContributorDto(Contributor contributor)
    {
        return new ContributorDto(
            contributor.UserContributedId,
            contributor.FullName,
            contributor.Nickname,
            contributor.NumberOfContributions,
            contributor.PorcentageOfContributions);
    }

    private static GameListItemDto ToGameListItemDto(Item item)
    {
        return new GameListItemDto(
            item.Id,
            item.Position,
            item.GameTitle,
            item.GameId,
            item.Game?.CoverImageUrl,
            item.Score);
    }

    private static UserSummaryDto ToUserSummaryDto(User user)
    {
        return new UserSummaryDto(
            user.Id,
            user.Nickname,
            user.FullName);
    }

    private static SourceDto ToSourceDto(Source source)
    {
        return new SourceDto(
            source.Id,
            source.Name,
            source.HostUrl);
    }

    private static FinalGameListSummaryDto ToFinalGameListSummaryDto(FinalGameList list)
    {
        return new FinalGameListSummaryDto(
            list.Id,
            list.Title,
            list.Year,
            list.Slug,
            list.GetFullName());
    }

    private static List<string> SplitTags(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return new List<string>();
        }

        return tags
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
    }
}
