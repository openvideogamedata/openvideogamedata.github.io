namespace community.Dtos.Friends;

public sealed record FriendUserDto(
    long Id,
    string Nickname,
    string FullName,
    string[]? UserPicture);

public sealed record FriendDto(
    long FriendshipId,
    FriendUserDto Friend);

public sealed record FriendRequestDto(
    long FriendshipId,
    FriendUserDto Requester);

public sealed record FriendsResponse(
    List<FriendDto> Friends,
    List<FriendRequestDto> ReceivedRequests,
    List<FriendRequestDto> SentRequests);

public sealed record FriendActivityItemDto(
    long TrackerId,
    FriendUserDto User,
    long GameId,
    string GameTitle,
    string CoverImageUrl,
    TrackStatus Status,
    DateTime LastUpdateDate,
    bool Platinum,
    string? Note);
