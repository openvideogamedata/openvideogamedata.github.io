namespace community.Dtos.Membership;

public sealed record CreateMembershipCheckoutResponse(
    string CheckoutSessionId,
    string Url);

public sealed record MembershipStatusResponse(
    bool IsMember,
    string? Status,
    DateTime? MemberSince,
    DateTime? MemberUntil);
