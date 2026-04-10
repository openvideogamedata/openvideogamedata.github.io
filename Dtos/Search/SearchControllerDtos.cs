using community.Dtos.GameLists;
using community.Dtos.Games;
using UsersDto = community.Dtos.Users.UserSummaryDto;

namespace community.Dtos.Search;

public sealed record SearchResponse(
    string Input,
    SearchResultSection<GameListCategoryDto> Lists,
    SearchResultSection<GameSummaryDto> Games,
    SearchResultSection<UsersDto> Users);

public sealed record SearchResultSection<T>(
    List<T> Items,
    object Pager);
