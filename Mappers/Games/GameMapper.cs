using community.Data;
using community.Dtos.Games;

namespace community.Mappers.Games;

public static class GameMapper
{
    public static GameSummaryDto ToSummaryDto(Game game)
    {
        return new GameSummaryDto(
            game.Id,
            game.Title,
            game.FirstReleaseDate,
            game.FirstReleaseDate.Year,
            game.ExternalCoverImageId,
            game.CoverImageUrl,
            game.CoverBigImageUrl,
            game.NumberOfLists,
            game.Score,
            game.GameUserTracker is null ? null : ToTrackerDto(game.GameUserTracker));
    }

    public static GameDetailsDto ToDetailsDto(Game game, int score)
    {
        return new GameDetailsDto(
            game.Id,
            game.Title,
            game.FirstReleaseDate,
            game.FirstReleaseDate.Year,
            game.ExternalId,
            game.ExternalCoverImageId,
            game.CoverImageUrl,
            game.CoverBigImageUrl,
            score);
    }

    public static CitationDto ToCitationDto(Item item)
    {
        return new CitationDto(
            item.Id,
            item.Position,
            item.Score,
            item.GameListId,
            item.GameList?.SourceListUrl,
            item.GameList?.Source?.Name,
            item.FinalGameListId,
            item.FinalGameList?.GetFullName(),
            item.FinalGameList?.Slug);
    }

    public static TrackerDto ToTrackerDto(GameUserTracker tracker)
    {
        return new TrackerDto(
            tracker.Id,
            tracker.UserId,
            tracker.GameId,
            tracker.Status,
            tracker.StatusDate,
            tracker.LastUpdateDate,
            tracker.Note,
            tracker.Platinum);
    }

    public static FriendTrackerDto ToFriendTrackerDto(GameUserTracker tracker)
    {
        return new FriendTrackerDto(
            ToTrackerDto(tracker),
            tracker.User is null
                ? null
                : new FriendUserDto(
                    tracker.User.Id,
                    tracker.User.Nickname,
                    tracker.User.FullName,
                    tracker.User.GetUserPicture()));
    }
}
