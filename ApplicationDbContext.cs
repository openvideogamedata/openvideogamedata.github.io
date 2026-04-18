using community.Data;
using Microsoft.EntityFrameworkCore;

public class ApplicationDbContext : DbContext {
    public DbSet<User> Users { get; set; }
    public DbSet<Game> Games { get; set; }
    public DbSet<GameListRequest> GameListRequests { get; set; }
    public DbSet<GameRequest> GameRequests { get; set; }
    public DbSet<Source> Sources { get; set; }
    public DbSet<Item> Items { get; set; }
    public DbSet<FinalGameList> FinalGameLists { get; set; }
    public DbSet<GameList> GameLists { get; set; }
    public DbSet<UserNotification> Notifications { get; set; }
    public DbSet<Friendship> Friendships { get; set; }
    public DbSet<GameUserTracker> GameUserTrackers { get; set; }
    public DbSet<Badge> Badges { get; set; }
    public DbSet<TopWinner> TopWinners { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) {
        
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        modelBuilder
            .Entity<User>()
            .HasMany(p => p.GameListRequestsLiked)
            .WithMany(p => p.UsersLiked)
            .UsingEntity(j => j.ToTable("UserLikedItem"));
        modelBuilder
            .Entity<User>()
            .HasMany(p => p.GameListRequestsDisliked)
            .WithMany(p => p.UsersDisliked)
            .UsingEntity(j => j.ToTable("UserDislikedItem"));
        modelBuilder
            .Entity<User>()
            .HasMany(p => p.Badges)
            .WithMany(p => p.Users)
            .UsingEntity(j => j.ToTable("UserBadge"));
        modelBuilder
            .Entity<User>()
            .HasMany(p => p.Notifications)
            .WithOne(p => p.User)
            .HasForeignKey(p => p.UserId);

        modelBuilder.Entity<Friendship>()
              .HasOne(fs => fs.UserRequested)
              .WithMany(u => u.RequestedFriends)
              .HasForeignKey(fs => fs.User1Id)
              .HasPrincipalKey(u => u.Id);
        modelBuilder.Entity<Friendship>()
              .HasOne(fs => fs.UserReceived)
              .WithMany(u => u.ReceivedFriends)
              .HasForeignKey(fs => fs.User2Id).OnDelete(DeleteBehavior.NoAction)
              .HasPrincipalKey(u => u.Id);

        modelBuilder
            .Entity<GameListRequest>()
            .HasOne(p => p.UserPosted)
            .WithMany(p => p.GameListRequestsPosted);
        modelBuilder
            .Entity<GameList>()
            .HasOne(p => p.UserContributed)
            .WithMany(p => p.GameListsContributed);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(r => r.Token)
            .IsUnique();

        AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);
            
        base.OnModelCreating(modelBuilder);
    }
}