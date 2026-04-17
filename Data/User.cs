using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using community.Data;

public class User 
{
    public long Id { get; set; }
    [Required]
    public string NameIdentifier { get; set; }
    [Required]
    public string GivenName { get; set; }
    public string Surname { get; set; }
    public string Nickname { get; set; }
    public string? Role { get; set; }
    public string? UserPixelArt { get; set; }
    public bool Banned { get; set; }
    public string? BanReason { get; set; }
    public bool IsMember { get; set; }
    public string? MembershipStatus { get; set; }
    public DateTime? MemberSince { get; set; }
    public DateTime? MemberUntil { get; set; }
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }

    public string FullName => GetNickname();

    public virtual ICollection<GameListRequest> GameListRequestsLiked { get; set; }
    public virtual ICollection<GameListRequest> GameListRequestsDisliked { get; set; }
    public virtual ICollection<GameListRequest> GameListRequestsPosted { get; set; }
    public virtual ICollection<GameList> GameListsContributed { get; set; }
    public virtual ICollection<UserNotification> Notifications { get; set; }
    public virtual ICollection<Friendship> RequestedFriends { get; set; }
    public virtual ICollection<Friendship> ReceivedFriends { get; set; }
    public virtual ICollection<Badge> Badges { get; set; }

    public string[]? GetUserPicture()
    {
        try
        {
            if (!string.IsNullOrEmpty(UserPixelArt))
                return JsonSerializer.Deserialize<string[]>(UserPixelArt);
            return null;
        }
        catch(Exception e)
        {
            Console.WriteLine($"[ERRO] - GetUserPicture - {e.Message}", e);
            return null;
        }
    }

    public string GetNickname()
    {
        try
        {
            if (Nickname == NameIdentifier || string.IsNullOrEmpty(Nickname))
            {
                var seed = int.Parse(NameIdentifier.Substring(12));
                Random r = new Random(seed);
                var adjectives = User.NickAdjectives;
                var nouns = User.NickNouns;
                string nick = "";
                int i = r.Next(2);
                while (i < 3)
                {
                    if (i == 2)
                        nick += nouns[r.Next(adjectives.Length)];
                    else
                    {
                        nick += adjectives[r.Next(adjectives.Length)];
                        nick += ' ';
                    }
                    i++;
                }
                return nick;
            }
            return Nickname;
        }
        catch(Exception e)
        {
            Console.WriteLine($"[ERRO] - GenerateRandomNickname - {e.Message}", e);
            return Nickname;
        }
    }

    public bool NicknameIsNameIdentifier()
    {
        try
        {
            if (Nickname.Length != 21)
                return false;

            if (Nickname == NameIdentifier)
                return true;

            var longPossible = Nickname[..19];
            ulong result = 0;
            var success = ulong.TryParse(longPossible, out result);
            return success && result != 0;
        }
        catch (Exception)
        {
            return false;
        }
    }

    [NotMapped]
    public static string[] NickAdjectives = {
        "Strange", "Epic", "Mighty", "Sneaky", "Fierce", "Crazy", "Lucky", "Fearless", "Savage", "Swift",
        "Mystic", "Furious", "Brave", "Wise", "Energetic", "Mysterious", "Heroic", "Magical", "Daring", "Swift",
        "Determined", "Adventurous", "Clever", "Enchanted", "Vibrant", "Valiant", "Fabled", "Ingenious", "Crafty", "Stealthy",
        "Radiant", "Dynamic", "Vigilant", "Tenacious", "Ethereal", "Nimble", "Cunning", "Resilient", "Gallant", "Vivid",
        "Volatile", "Furtive", "Audacious", "Majestic", "Eagle-eyed", "Daring", "Blazing", "Renowned", "Unyielding", "Dauntless",
        "Vengeful", "Astute", "Dazzling", "Incredible", "Enigmatic", "Luminous", "Spectacular", "Exuberant", "Astonishing", "Marvelous", "Mythical",
        "Radiant", "Sensational", "Whimsical", "Zesty", "Vivacious", "Gallant", "Vigorous", "Nimble", "Zealous", "Energetic",
        "Brilliant", "Clever", "Resilient", "Intrepid", "Resolute", "Vibrant", "Dynamic", "Thrilling", "Wondrous", "Unyielding",
        "Triumphant", "Astounding", "Fascinating", "Prowling", "Valiant", "Fierce", "Volatile", "Lucky", "Crafty", "Cunning",
        "Majestic", "Savage", "Dauntless", "Glorious", "Wise", "Daring", "Fearless", "Tenacious", "Sneaky", "Epic"
    };

    [NotMapped]
    public static string[] NickNouns = {
        "Potato", "Dragon", "Ninja", "Warrior", "Wanderer", "Mage", "Champion", "Hero", "Legend", "Gamer",
        "Guardian", "Phantom", "Wizard", "Sword", "Viking", "Beast", "Warlock", "Titan", "Samurai", "Rogue",
        "Mystic", "Centaur", "Crusader", "Gladiator", "Assassin", "Cyborg", "Horizon", "Journey", "Oracle", "Vortex",
        "Realm", "Conqueror", "Celestial", "Sorceress", "Knight", "Enigma", "Paladin", "Specter", "Enchanter", "Thunder",
        "Sentinel", "Chronicle", "Pirate", "Chaos", "Alchemist", "Nemesis", "Monarch", "Witch", "Falcon", "Inferno",
        "Sorcerer", "Guard", "Fortress", "Quest", "Legacy", "Ninja", "Shadow", "Phantom", "Rogue", "Warrior",
        "Vampire", "Vortex", "Sorceress", "Warlock", "Samurai", "Warrior", "Specter", "Titan", "Mystic", "Crusader",
        "Viking", "Ranger", "Wizard", "Gladiator", "Cyborg", "Witch", "Chaos", "Assassin", "Falcon", "Spartan",
        "Centaur", "Beast", "Rogue", "Sorceress", "Vampire", "Paladin", "Goddess", "Thunder", "Specter", "Warlord",
        "Nemesis", "Jester", "Gambit", "Mercenary", "Oracle", "Sentinel", "Brawler", "Scribe", "Chronicle", "Outlaw"
    };
}
public record GamificationValues(int Karma, int Contributions, string TopList, string TopListSlug, int Rank, IList<Badge> Badges);
