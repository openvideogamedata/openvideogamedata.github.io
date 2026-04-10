namespace community.Dtos.Admin;

public sealed record AdminStatsDto(
    int TotalGameLists,
    int TotalUsers);

public sealed record AdminUsersResponse(
    List<community.Dtos.Users.UserAdminDto> Users,
    object Pager);

public sealed record MasterListRegenerationResponse(
    bool Accepted,
    string Message);
