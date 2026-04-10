namespace community.Dtos;

public class UserActivityData
{
    public GameUserTracker MostRecentTracker { get; set; }
	public GameList GameList { get; set; }
	public User User { get; set; }
	public string UserProfileUrl { get; set; }
	public string GameListUrl { get; set; }
	public int ItemsTracked { get; set; }
	public DateTime DateAdded { get; set; }

    public ActivityType Activity { get; set; }

    public UserActivityData(GameList gameList)
    {
        try
        {
            GameList = gameList;
            User = gameList.UserContributed;
            UserProfileUrl = GetUserPerfilUrl(gameList.UserContributed);
            GameListUrl = GetGameListUrl(gameList.Id);
            DateAdded = gameList.DateAdded;
            Activity = ActivityType.GameList;
        }
        catch(Exception)
        {
            Activity = ActivityType.None;
        }
    }

    public UserActivityData(IEnumerable<IGrouping<DateTime, GameUserTracker>> userThenDateGroupedTracker)
    {
        try
        {
            var tracker = userThenDateGroupedTracker.First().First();
            MostRecentTracker = tracker;
            User = tracker.User;
            UserProfileUrl = GetUserPerfilUrl(tracker.User);
            ItemsTracked = userThenDateGroupedTracker.Count();
            DateAdded = userThenDateGroupedTracker.Last().First().LastUpdateDate;
            Activity = ActivityType.Tracker;
        }
        catch(Exception)
        {
            Activity = ActivityType.None;
        }
    }

    private string GetUserPerfilUrl(User? user)
    {
        if (user is not null) {
            return $"/users/{user.Nickname}";
        }
        return "";
    }

    private string GetGameListUrl(long gameListId) {
        return $"/source-lists/{gameListId}";
    }
}

public enum ActivityType
{
    None,
    GameList,
    Tracker
}
