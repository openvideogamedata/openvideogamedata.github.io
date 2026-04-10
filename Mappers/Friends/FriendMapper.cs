using community.Dtos;
using community.Dtos.Friends;

namespace community.Mappers.Friends;

public static class FriendMapper
{
    public static FriendDto ToFriendDto(FriendConfirmed friendship)
    {
        return new FriendDto(
            friendship.FriendshipId,
            ToFriendUserDto(friendship.Friend));
    }

    public static FriendRequestDto ToRequestDto(FriendRequest request)
    {
        return new FriendRequestDto(
            request.FriendshipId,
            ToFriendUserDto(request.Requester));
    }

    private static FriendUserDto ToFriendUserDto(User user)
    {
        return new FriendUserDto(
            user.Id,
            user.Nickname,
            user.FullName,
            user.GetUserPicture());
    }
}
