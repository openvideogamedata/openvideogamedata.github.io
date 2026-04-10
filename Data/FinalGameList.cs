using System.ComponentModel.DataAnnotations.Schema;

namespace community.Data;

public class FinalGameList
{
    public long Id { get; set; }
    public string Title { get; set; }
    public int? Year { get; set; }

    [NotMapped]
    public int NumberOfGames { get; set; }
    [NotMapped]
    public int NumberOfSources { get; set; }
    [NotMapped]
    public List<GroupItem> TopThreeWinners { get; set; } = new List<GroupItem>();

    public bool ConsideredForAvgScore { get; set; }
    public bool Pinned { get; set; }
    public int PinnedPriority { get; set; } = 0;
    public string Slug { get; set; }

    public List<GameList> GameLists { get; set; }
    public string SocialUrl { get; set; }
    public int SocialComments { get; private set; }
    public string Tags { get; set; }
    [NotMapped]
    public List<SourceList> SimilarLists { get; set; }

    public void SetSocialComments(int totalComments)
    {
        SocialComments = totalComments;
    }

    public string GetFullName() {
        if (Year is null) 
            return Title;
        
        return $"{Title} {Year}";
    }

    public string GetSocialComments() {
        return $"{SocialComments.ToString()} Comments";
    }
}

public record struct SourceList(string SourceName, string SourceUrl, DateTime? SourceDateLastUpdated, int? Year = null);
public record Contributor(long UserContributedId, string FullName, string Nickname, int NumberOfContributions, int PorcentageOfContributions);
