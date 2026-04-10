namespace community.Dtos.Notifications;

public sealed record NotificationDto(
    long Id,
    string Message,
    bool Read,
    DateTime DateAdded);
