using community.Data;
using community.Dtos.GameLists;
using community.Dtos.ListSuggestions;

namespace community.Mappers.ListSuggestions;

public static class ListSuggestionMapper
{
    public static GameListRequestDto ToDto(GameListRequest request)
    {
        return new GameListRequestDto(
            request.Id,
            request.SourceListUrl,
            request.SourceName,
            request.HostUrl,
            request.FinalGameListId,
            request.FinalGameList is null
                ? null
                : new FinalGameListSummaryDto(
                    request.FinalGameList.Id,
                    request.FinalGameList.Title,
                    request.FinalGameList.Year,
                    request.FinalGameList.Slug,
                    request.FinalGameList.GetFullName()),
            request.Score,
            request.DateAdded,
            request.UserPostedId,
            request.UserPosted is null
                ? null
                : new UserSummaryDto(
                    request.UserPosted.Id,
                    request.UserPosted.Nickname,
                    request.UserPosted.FullName),
            request.Hidden,
            request.UsersLiked?.Count ?? 0,
            request.UsersDisliked?.Count ?? 0,
            request.GameRequests?.OrderBy(game => game.Position).Select(ToGameRequestDto).ToList() ?? new List<GameRequestDto>());
    }

    public static GameListRequest ToEntity(CreateGameListRequestInput request, long userId)
    {
        return new GameListRequest
        {
            SourceListUrl = request.SourceListUrl,
            FinalGameListId = request.FinalGameListId,
            DateAdded = DateTime.UtcNow,
            Hidden = false,
            UserPostedId = userId,
            GameRequests = request.Games.Select(ToEntity).ToList()
        };
    }

    private static GameRequestDto ToGameRequestDto(GameRequest request)
    {
        return new GameRequestDto(
            request.Id,
            request.Position,
            request.GameTitle,
            request.GameId,
            request.FirstReleaseDate);
    }

    public static GameRequest ToEntity(GameRequestInput request)
    {
        return new GameRequest
        {
            Position = request.Position,
            GameTitle = request.GameTitle,
            GameId = request.GameId,
            FirstReleaseDate = request.FirstReleaseDate ?? ""
        };
    }
}
