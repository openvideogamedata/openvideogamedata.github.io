using community.Dtos.ListSuggestions;

namespace community.Dtos.UserLists;

public sealed record UserListWriteRequest(
    long FinalGameListId,
    List<GameRequestInput> Games);
