using System.ComponentModel.DataAnnotations;

namespace community.Data;

public class RefreshToken
{
    public long Id { get; set; }
    [Required]
    public string Token { get; set; }
    public long UserId { get; set; }
    public User User { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt.HasValue;
    public bool IsActive => !IsExpired && !IsRevoked;
}
