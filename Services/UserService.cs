using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using community.Data;
using community.Dtos.Users;
using community.Dtos.Friends;
using community.Utils;
using Microsoft.EntityFrameworkCore;

namespace community.Services;

public sealed class UserService
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    private readonly IHttpContextAccessor _context;

    public UserService(IDbContextFactory<ApplicationDbContext> factory, IHttpContextAccessor context)
    {
        _factory = factory;
        _context = context;
    }

    public User GetByNameIdentifier(string? nameIdentifier, bool includeNotifications = false)
    {
        if (string.IsNullOrEmpty(nameIdentifier)) return null;
        
        using var context = this._factory.CreateDbContext();
        User? user = null;

        if (includeNotifications)
            user = context.Users.AsNoTracking().Include(x => x.Notifications).FirstOrDefault(u => u.NameIdentifier == nameIdentifier);
        else
            user = context.Users.AsNoTracking().FirstOrDefault(u => u.NameIdentifier == nameIdentifier);

        if (user == null)
            user = CreateUserIfNotExists();

        return user;
    }

    public User? GetByNickname(string? nickname)
    {
        if (string.IsNullOrEmpty(nickname)) return null;
        
        using var context = this._factory.CreateDbContext();
        return context.Users.FirstOrDefault(u => u.Nickname.ToLower() == nickname.ToLower());
    }

    public async Task<bool> NicknameIsAvailable(string? nickname)
    {
        if (string.IsNullOrEmpty(nickname) || nickname == "new-list" || nickname == "trackers" ||
        nickname == "none" || nickname == "friends" || nickname == "fill" || nickname == "notifications" ||
        nickname.Contains(' ')) return false;
        
        using var context = this._factory.CreateDbContext();
        var exists = await context.Users.AnyAsync(u => u.Nickname.ToLower() == nickname.ToLower());
        return !exists;
    }

    public async Task UpdateNickname(string nickname, User user)
    {
        var available = await NicknameIsAvailable(nickname);

        if (available)
        {
            using var context = this._factory.CreateDbContext();
            var userTracked = context.Users.Find(user.Id);

            if (userTracked != null) 
            {
                userTracked.Nickname = nickname;
                context.Users.Update(userTracked);
                await context.SaveChangesAsync();
            }
        }
    }

    public async Task<GamificationValues?> GetGamificationValues(User user)
    {
        try
        {
            using var context = this._factory.CreateDbContext();

            var badges = await context.Badges.Where(x => x.Users.Any(y => y.Id == user.Id)).OrderByDescending(x => x.Priority).ToListAsync();
            var topContributedListsFromUserFromDb = await context.GameLists.AsNoTracking().Include(x => x.FinalGameList).AsNoTracking().Where(x => x.UserContributedId == user.Id).GroupBy(x => x.FinalGameListId).ToListAsync();
            if (topContributedListsFromUserFromDb != null && topContributedListsFromUserFromDb.Any())
            {
                var usersOrderedByContributions = await context.Users.OrderByDescending(x => x.GameListsContributed.Count).ToListAsync();
                var globalRank = usersOrderedByContributions.FindIndex(x => x.Id == user.Id) + 1;
                var topContributedListFromDb = topContributedListsFromUserFromDb.OrderBy(x => x.Count()).Select(x => new { x.FirstOrDefault().FinalGameList.Title, x.FirstOrDefault().FinalGameList.Year, x.FirstOrDefault().FinalGameList.Slug }).LastOrDefault();
                var topContributedList = string.IsNullOrEmpty(topContributedListFromDb.Title) ? "-" : $"{topContributedListFromDb.Title} {(topContributedListFromDb.Year != null ? topContributedListFromDb.Year : "")}";
                var topContributedListSlug = string.IsNullOrEmpty(topContributedListFromDb.Slug) ? "" : topContributedListFromDb.Slug;
                
                return await context.Users
                    .AsNoTracking()
                    .Include(x => x.GameListRequestsPosted)
                    .Include(x => x.GameListsContributed)
                    .Where(x => x.Id == user.Id)
                    .Select(x => new GamificationValues(
                        x.GameListRequestsPosted.Sum(y => y.UsersLiked.Where(z => z.Id != user.Id).Count()),
                        x.GameListsContributed.Count(),
                        topContributedList,
                        topContributedListSlug,
                        globalRank,
                        badges))
                    .FirstOrDefaultAsync();
            }

            return new GamificationValues(0, 0, "", "", 0, badges);
        }
        catch(Exception e)
        {
            Console.WriteLine($"[ERRO] - GetGamificationValues - {e.Message}", e);
            return new GamificationValues(0, 0, "", "", 0, new List<Badge>());
        }
    }

    public async Task<IList<User>> GetTopContributors()
    {
        using var context = _factory.CreateDbContext();
        var usersOrderedByContributions = await context.Users.AsNoTracking().Include(x => x.GameListsContributed).OrderByDescending(x => x.GameListsContributed.Count).Take(15).ToListAsync();
        return usersOrderedByContributions;
    }

    public async Task<List<TrackFilters>> GetTrackersByUserId(long? userId)
    {
        if (!userId.HasValue) { return new List<TrackFilters>(); }

        using var context = this._factory.CreateDbContext();
        var trackers = await context.GameUserTrackers
                                    .AsNoTracking()
                                    .Where(x => x.UserId == userId)
                                    .Select(x => new TrackFilters() {
                                        TrackStatus = x.Status,
                                        TrackStatusCount = 0,
                                    })
                                    .ToListAsync();
        if (trackers != null)
        {
            trackers = trackers.GroupBy(x => x.TrackStatus).Select(g => new TrackFilters() {
                TrackStatus = g.First().TrackStatus,
                TrackStatusCount = g.Count(),
            })
            .OrderBy(x => (int)x.TrackStatus)
            .Where(x => x.TrackStatus != TrackStatus.None)
            .ToList();
            return trackers;
        }
        return new List<TrackFilters>();
    }

    public User GetOrCreateFromGooglePayload(string nameIdentifier, string givenName, string surname)
    {
        using var context = this._factory.CreateDbContext();
        var user = context.Users.AsNoTracking().FirstOrDefault(u => u.NameIdentifier == nameIdentifier);

        if (user == null)
        {
            var newUser = new User
            {
                NameIdentifier = nameIdentifier,
                Nickname = nameIdentifier,
                GivenName = string.IsNullOrEmpty(givenName) ? "Player" : givenName,
                Surname = surname ?? ""
            };
            try
            {
                context.Users.Add(newUser);
                context.SaveChanges();
                user = newUser;
            }
            catch (DbUpdateException)
            {
                user = context.Users.AsNoTracking().FirstOrDefault(u => u.NameIdentifier == nameIdentifier) ?? newUser;
            }
        }

        return user;
    }

    public User? CreateUserIfNotExists()
    {
        var userInput = CreateUserModelFromClaims();
        if (userInput == null)
            return null;

        using var context = this._factory.CreateDbContext();
        var user = context.Users.AsNoTracking().FirstOrDefault(u => u.NameIdentifier == userInput.NameIdentifier);

        if (user == null)
        {
            try
            {
                context.Users.Add(userInput);
                context.SaveChanges();
            }
            catch (DbUpdateException)
            {
                // Another request created the user concurrently — fetch the existing record
                user = context.Users.AsNoTracking().FirstOrDefault(u => u.NameIdentifier == userInput.NameIdentifier);
                if (user != null)
                {
                    userInput.Nickname = user.Nickname;
                    userInput.Id = user.Id;
                    userInput.UserPixelArt = user.UserPixelArt;
                }
            }
        }
        else
        {
            userInput.Nickname = user.Nickname;
            userInput.Id = user.Id;
            userInput.UserPixelArt = user.UserPixelArt;
        }

        return userInput;
    }

    public (List<User>, Pager) GetAll(int currentPage = 1, int pageSize = 10, int maxPages = 5, string search = "")
    {
        search = search.ReplaceSpecialCharacters().ToLower();

        using var context = this._factory.CreateDbContext();

        System.Linq.Expressions.Expression<Func<User, bool>> searchQuery = x =>
            x.Nickname.ToLower()
                .Replace("á","a")
                .Replace("é","e")
                .Replace("í","i")
                .Replace("ó","o")
                .Replace("ú","u").Contains(search);
        
        var totalItems = context.Users.Where(searchQuery).Count();
        var pager = new Pager(totalItems, currentPage, pageSize, maxPages);
        var users = context.Users.Where(searchQuery)
                                 .OrderBy(x => x.Id)
                                 .Skip((pager.CurrentPage - 1) * pager.PageSize)
                                 .Include(x => x.GameListsContributed)
                                 .Take(pager.PageSize)
                                 .ToList();

        return (users, pager);
    }

    public string? GetLoggedUserNameIdentifier()
    {
        var userClaims = _context.HttpContext?.User;
        return userClaims?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    public User GetLoggedUserWithNotifications(bool readNotifications = false)
    {
        var user = GetLoggedUser(true);
        if (readNotifications)
            ReadAllNotifications(user.Id);
        return user;
    }

    public async Task SendNotification(string message, long userId)
    {
        using var context = this._factory.CreateDbContext();
        var notification = new UserNotification()
        {
            Message = message,
            Read = false,
            UserId = userId,
            DateAdded = DateTime.UtcNow
        };
        context.Add(notification);
        await context.SaveChangesAsync();
    }

    public bool LoggedUserHasAnyNotifications()
    {
        try
        {
            var user = GetLoggedUser(true);
            if (user != null)
                return user.Notifications.Any(x => !x.Read);
            return false;
        }
        catch(Exception e)
        {
            Console.WriteLine($"[ERRO] - LoggedUserHasAnyNotifications - {e.Message}", e);
            return false;
        }
    }

    public bool UserHasAnyNotifications(long userId)
    {
        using var context = this._factory.CreateDbContext();
        return context.Notifications.Any(x => !x.Read && x.UserId == userId);
    }

    public User GetLoggedUser(bool includeNotifications = false)
    {
        return GetByNameIdentifier(GetLoggedUserNameIdentifier(), includeNotifications);
    }

    public bool IsLogged()
    {
        try 
        {
            using var context = this._factory.CreateDbContext();

            var userClaims = _context.HttpContext?.User;
            var userNameId = userClaims?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userIsLoggedAndExists = false;

            if (!string.IsNullOrEmpty(userNameId))
                userIsLoggedAndExists = context.Users.Any(x => x.NameIdentifier == userNameId);
            return userIsLoggedAndExists;
        }
        catch(Exception e)
        {
            Console.WriteLine($"[ERRO] - IsLogged - {e}");
            return false;
        }
    }

    public async Task ToggleBan(string nameIdentifier, bool banned)
    {
        using var context = this._factory.CreateDbContext();
        var user = await context.Users.FirstOrDefaultAsync(u => u.NameIdentifier == nameIdentifier);
        if (user != null)
        {
            user.Banned = banned;
            context.Users.Update(user);
            await context.SaveChangesAsync();
        }
    }

    public bool UserIsBanned(string? nameIdentifier)
    {
        if (string.IsNullOrEmpty(nameIdentifier)) return false;

        using var context = this._factory.CreateDbContext();
        return context.Users.Any(u => u.NameIdentifier == nameIdentifier && u.Banned);
    }

    public async Task GiveBadge(long badgeId, long userId, bool notify = true)
    {
        if (badgeId == 0 || userId == 0) return;

        using var context = this._factory.CreateDbContext();
        var user = context.Users.Include(x => x.Badges).FirstOrDefault(x => x.Id == userId);
        if (user != null)
        {
            var alreadyHasBadge = user.Badges.Any(x => x.Id == badgeId);
            if (!alreadyHasBadge)
            {
                var badge = context.Badges.Find(badgeId);
                if (badge != null)
                {
                    user.Badges.Add(badge);
                    context.SaveChanges();
                    if (notify)
                        await SendNotification($"Contratulations! You received the badge '{badge.Name}' and it is now on display at your profile!", userId);
                }
            }
        }
    }

    public async Task RemoveBadge(long badgeId, long userId)
    {
        if (badgeId == 0 || userId == 0) return;

        using var context = this._factory.CreateDbContext();
        var user = context.Users.Include(x => x.Badges).FirstOrDefault(x => x.Id == userId);
        if (user != null)
        {
            var badgeGiven = user.Badges.FirstOrDefault(x => x.Id == badgeId);
            if (badgeGiven != null)
            {
                user.Badges.Remove(badgeGiven);
                await context.SaveChangesAsync();
            }
        }
    }

    public async Task DeleteAccount(long id)
    {
        if (id == 0) return;
        
        using var context = this._factory.CreateDbContext();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == id);
        var friendships = await context.Friendships.Where(x => x.User1Id == id || x.User2Id == id).ToListAsync();

        if (friendships != null && friendships.Count != 0)
        {
            context.Friendships.RemoveRange(friendships);
        }
        if (user != null)
        {
            context.Users.Remove(user);
            await context.SaveChangesAsync();
        }
    }

    private void ReadAllNotifications(long userId)
    {
        using var context = this._factory.CreateDbContext();
        var userNotifications = context.Notifications.Where(x => x.UserId == userId).ToList();
        if (userNotifications.Any(x => !x.Read))
        {
            foreach (var notification in userNotifications)
            {
                notification.Read = true;
            }
            context.Notifications.UpdateRange(userNotifications);
            context.SaveChanges();
        }
    }

    private User? CreateUserModelFromClaims()
    {
        try
        {
            var userClaims = _context.HttpContext?.User;
            TryToLogClaims(userClaims);
            var nameIdentifier = userClaims?.FindFirst(ClaimTypes.NameIdentifier);
            var name = userClaims?.FindFirst(ClaimTypes.Name);
            var role = userClaims?.FindFirst(ClaimTypes.Role);
            var givenName = userClaims?.FindFirst(ClaimTypes.GivenName);
            var surname = userClaims?.FindFirst(ClaimTypes.Surname);
            var avatar = userClaims?.FindFirst("urn:google:image");
            Console.WriteLine($"CreateUserModelFromClaims - Name Id: {nameIdentifier?.Value}");

            givenName = givenName == null ? name : givenName;
            var surnameString = surname == null ? "" : surname.Value;
            var givenNameString = givenName == null ? "Player" : givenName.Value;
            
            return new User() {
                NameIdentifier = nameIdentifier.Value,
                Nickname = nameIdentifier.Value,
                GivenName = givenNameString,
                Surname = surnameString
            };
        }
        catch(Exception e)
        {
            Console.WriteLine("Claim vazia ocorre em logout");
            Console.WriteLine($"[ERRO] - CreateUserModelFromClaims - {e.Message}", e);
            return null;
        }
    }

    public async Task<bool> UpdatePixelArt(string[]? pixelArray, User user)
    {
        try
        {
            using var context = this._factory.CreateDbContext();
            var userTracked = context.Users.Find(user.Id);

            if (userTracked != null) 
            {
                var pixelString = JsonSerializer.Serialize(pixelArray);
                if (userTracked.UserPixelArt != pixelString)
                {
                    userTracked.UserPixelArt = pixelString;
                    context.Users.Update(userTracked);
                    await context.SaveChangesAsync();
                }
                return true;
            }
            return false;
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - UpdatePixelArt - {e.Message}", e); 
            return false;
        }
    }

    public async Task AddFriend(long userRequestedId, long userReceivedId)
    {
        using var context = this._factory.CreateDbContext();
        var friendship = new Friendship()
        {
            User1Id = userRequestedId,
            User2Id = userReceivedId
        };
        context.Add(friendship);
        await context.SaveChangesAsync();
    }

    public async Task RemoveFriendship(long friendshipId)
    {
        using var context = this._factory.CreateDbContext();
        var friendship = await context.Friendships.FindAsync(friendshipId);
        if (friendship != null)
        {
            context.Remove(friendship);
            await context.SaveChangesAsync();
        }
    }

    public async Task<IList<FriendRequest>> GetFriendRequests(long userId)
    {
        var friendship = await GetFriendships(userId, FriendshipStatus.WAITING);
        return friendship.Select(x => new FriendRequest() { Requester = x.UserRequested.Id != userId ? x.UserRequested : null, FriendshipId = x.Id })
            .Where(x => x.Requester != null)
            .ToList();
    }

    public async Task<IList<FriendRequest>> GetFriendRequestsSent(long userId)
    {
        var friendship = await GetFriendships(userId, FriendshipStatus.WAITING);
        return friendship.Select(x => new FriendRequest() { Requester = x.UserRequested.Id == userId ? x.UserReceived : null, FriendshipId = x.Id })
            .Where(x => x.Requester != null)
            .ToList();
    }

    public async Task<IList<FriendConfirmed>> GetFriends(long userId)
    {
        var friendship = await GetFriendships(userId, FriendshipStatus.ACCEPTED);
        return friendship.Select(x => new FriendConfirmed() {
            Friend = x.UserRequested.Id != userId ? x.UserRequested : x.UserReceived, FriendshipId = x.Id
        }).ToList();
    }

    public async Task AcceptFriendRequest(long friendshipId)
    {
        await UpdateFriendRequest(friendshipId, FriendshipStatus.ACCEPTED);
    }

    public async Task RejectFriendRequest(long friendshipId)
    {
        await UpdateFriendRequest(friendshipId, FriendshipStatus.REJECTED);
    }

    public async Task<bool> AreFriends(long user1Id, long user2Id)
    {
        return await CheckFriendship(user1Id, user2Id, FriendshipStatus.ACCEPTED);
    }

    public async Task<bool> HavePendingFriendship(long user1Id, long user2Id)
    {
        return await CheckFriendship(user1Id, user2Id, FriendshipStatus.WAITING);
    }

    public async Task<IList<Badge>> GetBadges(long userId)
    {
        using var context = this._factory.CreateDbContext();
        var user = await context.Users.Include(x => x.Badges).AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (user != null && user.Badges != null)
            return user.Badges.OrderByDescending(x => x.Priority).ToList();
        return new List<Badge>();
    }

    public async Task<IList<Badge>> GetAllBadges()
    {
        using var context = this._factory.CreateDbContext();
        var badges = await context.Badges.AsNoTracking().OrderByDescending(x => x.Priority).ToListAsync();
        if (badges != null)
            return badges;
        return new List<Badge>();
    }

    public async Task<bool> UpdateBadgePixelArt(string[]? pixelArray, Badge badge)
    {
        try
        {
            using var context = this._factory.CreateDbContext();
            var badgeTracked = context.Badges.Find(badge.Id);

            if (badgeTracked != null) 
            {
                var pixelString = JsonSerializer.Serialize(pixelArray);
                if (badgeTracked.PixelArt != pixelString)
                {
                    badgeTracked.PixelArt = pixelString;
                    context.Badges.Update(badgeTracked);
                    await context.SaveChangesAsync();
                }
                return true;
            }
            return false;
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - UpdateBadgePixelArt - {e.Message}", e); 
            return false;
        }
    }

    public async Task CreateBadge(string name, string description, string pixelArt, bool automatic, int priority)
    {
        try
        {
            using var context = this._factory.CreateDbContext();
            
            var badge = new Badge()
            {
                Name = name,
                Description = description, 
                PixelArt = pixelArt,
                AutomaticallyGiven = automatic,
                Priority = priority
            };

            context.Badges.Add(badge);
            await context.SaveChangesAsync();
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - CreateBadge - {e.Message}", e);
        }
    }

    public async Task UpdateBadge(long id, string name, string description, string pixelArt, bool automatic, int priority)
    {
        try
        {
            using var context = this._factory.CreateDbContext();

            var badge = context.Badges.Find(id);
            if (badge != null)
            {
                badge.Name = name;
                badge.Description = description;
                badge.PixelArt = pixelArt;
                badge.AutomaticallyGiven = automatic;
                badge.Priority = priority;

                context.Badges.Update(badge);
                await context.SaveChangesAsync();
            }
        }
        catch (Exception e)
        {
            Console.WriteLine($"[ERRO] - CreateBadge - {e.Message}", e);
        }
    }

    public async Task<FriendsListComparisonResult?> CompareListsIfFriends(long userComparedId, long userComparingId, GameList listFromUserCompared)
    {
        using var context = this._factory.CreateDbContext();

        var areFriends = await AreFriends(userComparedId, userComparingId);
        if (areFriends)
        {
            var listFromUserComparing = context.GameLists
                    .AsNoTracking()
                    .Include(gameList => gameList.FinalGameList)
                    .Include(gameList => gameList.Source)
                    .Include(gameList => gameList.UserContributed)
                    .Include(gameList => gameList.Items)
                    .ThenInclude(item => item.Game)
                    .FirstOrDefault(gameList =>
                        gameList.FinalGameListId == listFromUserCompared.FinalGameListId &&
                        gameList.UserContributedId == userComparingId &&
                        gameList.ByUser);

            if (listFromUserComparing != null)
            {
                return new FriendsListComparisonResult(listFromUserCompared, listFromUserComparing);
            }
        }
        return null;
    }

    public async Task<List<GameUserTracker>?> GetFriendsCommentsOnGame(long userId, long gameId)
    {
        using var context = this._factory.CreateDbContext();
        var friends = await GetFriends(userId);
        var friendsIds = friends.Select(x => x.Friend.Id).ToList();
        return await context.GameUserTrackers
                    .Include(x => x.User)
                    .Where(tracker => tracker.GameId == gameId && friendsIds.Contains(tracker.UserId))
                    .ToListAsync();
    }

    public async Task<List<FriendActivityItemDto>> GetFriendActivity(long userId, int page = 1, int pageSize = 20)
    {
        using var context = _factory.CreateDbContext();

        var friendIds = await context.Friendships
            .AsNoTracking()
            .Where(f => (f.User1Id == userId || f.User2Id == userId)
                     && f.Status == FriendshipStatus.ACCEPTED)
            .Select(f => f.User1Id == userId ? f.User2Id : f.User1Id)
            .ToListAsync();

        if (!friendIds.Any())
            return new List<FriendActivityItemDto>();

        var trackers = await context.GameUserTrackers
            .AsNoTracking()
            .Include(t => t.User)
            .Include(t => t.Game)
            .Where(t => friendIds.Contains(t.UserId) && t.Status != TrackStatus.None)
            .OrderByDescending(t => t.LastUpdateDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return trackers.Select(t => new FriendActivityItemDto(
                t.Id,
                new FriendUserDto(
                    t.User!.Id,
                    t.User.Nickname,
                    t.User.FullName,
                    t.User.GetUserPicture()),
                t.GameId,
                t.Game!.Title,
                t.Game.CoverImageUrl,
                t.Status,
                t.LastUpdateDate,
                t.Platinum,
                t.Note))
            .ToList();
    }

    public async Task<UserDashboardDto?> GetDashboard(long userId)
    {
        using var context = _factory.CreateDbContext();

        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
            return null;

        var listsCreated = await context.GameLists
            .AsNoTracking()
            .Where(x => x.UserContributedId == userId && x.ByUser)
            .CountAsync();

        var trackerGroups = await context.GameUserTrackers
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.Status != TrackStatus.None)
            .GroupBy(x => x.Status)
            .Select(x => new { Status = x.Key, Count = x.Count() })
            .ToListAsync();

        var totalTrackers = trackerGroups.Sum(x => x.Count);

        var unreadNotifications = await context.Notifications
            .AsNoTracking()
            .CountAsync(x => x.UserId == userId && !x.Read);

        var friendsCount = await context.Friendships
            .AsNoTracking()
            .CountAsync(x => (x.User1Id == userId || x.User2Id == userId) && x.Status == FriendshipStatus.ACCEPTED);

        var pendingFriendRequests = await context.Friendships
            .AsNoTracking()
            .CountAsync(x => x.User2Id == userId && x.Status == FriendshipStatus.WAITING);

        var badgesCount = await context.Badges
            .AsNoTracking()
            .CountAsync(x => x.Users.Any(y => y.Id == userId));

        var profile = new UserDashboardProfileDto(
            user.Id,
            user.Nickname,
            user.FullName,
            user.GetUserPicture(),
            user.NicknameIsNameIdentifier(),
            unreadNotifications,
            friendsCount,
            pendingFriendRequests,
            badgesCount,
            totalTrackers,
            listsCreated);

        var checklist = new List<UserDashboardChecklistItemDto>
        {
            new("nickname", "Choose your nickname", "Pick the public name that will represent you across OpenVGD.", "/users/fill", !user.NicknameIsNameIdentifier()),
            new("avatar", "Set your pixel avatar", "Customize your profile so people can recognize you faster.", $"/users/{user.Nickname}", user.GetUserPicture() is not null),
            new("list", "Create your first list", "Start contributing with your own ranked list.", "/lists/new", listsCreated > 0),
            new("tracker", "Track your first game", "Mark a game as playing, beaten, or to-play.", "/games", totalTrackers > 0),
            new("friend", "Connect with a friend", "Follow other contributors and compare your activity.", "/users", friendsCount > 0),
        };

        var stats = new List<UserDashboardStatDto>
        {
            new("Lists", listsCreated.ToString(), listsCreated == 0 ? "Create your first community list." : "Lists created by you.", listsCreated == 0 ? "/lists/new" : $"/users/{user.Nickname}/lists"),
            new("Tracked games", totalTrackers.ToString(), totalTrackers == 0 ? "No tracker activity yet." : "Games already tracked by you.", $"/users/{user.Nickname}/trackers"),
            new("Badges", badgesCount.ToString(), badgesCount == 0 ? "Your first badge is still waiting." : "Badges currently visible on your profile.", "/badges"),
            new("Notifications", unreadNotifications.ToString(), unreadNotifications == 0 ? "No unread items right now." : "Unread updates waiting for you.", "/notifications"),
        };

        var actions = BuildDashboardActions(profile, checklist);

        var recentLists = await context.GameLists
            .AsNoTracking()
            .Include(x => x.FinalGameList)
            .Where(x => x.UserContributedId == userId && x.ByUser && x.FinalGameList != null)
            .OrderByDescending(x => x.DateAdded)
            .Take(3)
            .Select(x => new UserDashboardActivityDto(
                "list",
                $"You created \"{x.FinalGameList!.GetFullName()}\"",
                "Your own list is now part of your public profile.",
                $"/users/{user.Nickname}/lists",
                x.DateAdded))
            .ToListAsync();

        var recentTrackers = await context.GameUserTrackers
            .AsNoTracking()
            .Include(x => x.Game)
            .Where(x => x.UserId == userId && x.Status != TrackStatus.None && x.Game != null)
            .OrderByDescending(x => x.LastUpdateDate)
            .Take(3)
            .Select(x => new UserDashboardActivityDto(
                "tracker",
                $"{GetTrackStatusLabel(x.Status)}: {x.Game!.Title}",
                "Your tracker history is helping build your profile activity.",
                $"/users/{user.Nickname}/trackers",
                x.LastUpdateDate))
            .ToListAsync();

        var recentActivity = recentLists
            .Concat(recentTrackers)
            .OrderByDescending(x => x.Date)
            .Take(5)
            .ToList();

        return new UserDashboardDto(profile, stats, checklist, actions, recentActivity);
    }

    private async Task<IList<Friendship>> GetFriendships(long userId, FriendshipStatus status)
    {
        using var context = this._factory.CreateDbContext();
        var requests = await context.Friendships
            .AsNoTracking()
            .Include(x => x.UserRequested)
            .Include(x => x.UserReceived)
            .Where(f => (f.User1Id == userId || f.User2Id == userId) && f.Status == status)
            .ToListAsync();
        if (requests != null && requests.Any())
            return requests;
        return new List<Friendship>();
    }

    private async Task UpdateFriendRequest(long friendshipId, FriendshipStatus status)
    {
        using var context = this._factory.CreateDbContext();
        var friendship = await context.Friendships.FirstOrDefaultAsync(f => f.Id == friendshipId);
        if (friendship == null)
            return;
        friendship.Status = status;
        context.Update(friendship);
        await context.SaveChangesAsync();
    }

    private async Task<bool> CheckFriendship(long user1Id, long user2Id, FriendshipStatus status)
    {
        using var context = this._factory.CreateDbContext();
        return await context.Friendships
            .AsNoTracking()
            .AnyAsync(f => (f.User1Id == user1Id || f.User1Id == user2Id) &&
            (f.User2Id == user1Id || f.User2Id == user2Id)
            && f.Status == status);   
    }

    private void TryToLogClaims(ClaimsPrincipal userClaims)
    {
        var userClaimsString = "";
        try
        {
            if (userClaims != null)
                userClaimsString = JsonSerializer.Serialize(userClaims?.Claims.Select(x => x.Value).ToList(), new JsonSerializerOptions() { ReferenceHandler = ReferenceHandler.IgnoreCycles });
        } catch { }
        Console.WriteLine($"CreateUserModelFromClaims - User Claims: {userClaimsString}");
    }

    private static string GetTrackStatusLabel(TrackStatus status)
    {
        return status switch
        {
            TrackStatus.ToPlay => "To Play",
            TrackStatus.Playing => "Playing",
            TrackStatus.Beaten => "Beaten",
            TrackStatus.Abandoned => "Abandoned",
            TrackStatus.Played => "Played",
            _ => "Tracked",
        };
    }

    private static List<UserDashboardActionDto> BuildDashboardActions(
        UserDashboardProfileDto profile,
        List<UserDashboardChecklistItemDto> checklist)
    {
        var actions = new List<UserDashboardActionDto>();

        var nextChecklist = checklist.FirstOrDefault(x => !x.Completed);
        if (nextChecklist is not null)
        {
            actions.Add(new UserDashboardActionDto(
                "Finish your setup",
                nextChecklist.Title,
                nextChecklist.Href,
                "primary"));
        }

        if (profile.UnreadNotifications > 0)
        {
            actions.Add(new UserDashboardActionDto(
                "Review notifications",
                $"{profile.UnreadNotifications} unread update{(profile.UnreadNotifications == 1 ? "" : "s")} waiting for you.",
                "/notifications",
                "accent"));
        }

        if (profile.TotalTrackers == 0)
        {
            actions.Add(new UserDashboardActionDto(
                "Start tracking games",
                "Add statuses to games you want to play or already finished.",
                "/games",
                "neutral"));
        }

        if (profile.ListsCreated == 0)
        {
            actions.Add(new UserDashboardActionDto(
                "Create your first list",
                "Publish a personal list and start showing your taste.",
                "/lists/new",
                "neutral"));
        }

        if (profile.FriendsCount == 0)
        {
            actions.Add(new UserDashboardActionDto(
                "Find people to follow",
                "Connect with other contributors and compare activity.",
                "/users",
                "neutral"));
        }

        return actions.Take(4).ToList();
    }
}
