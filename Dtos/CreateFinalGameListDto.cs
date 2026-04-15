using System.ComponentModel.DataAnnotations;

namespace community.Dtos;

public class CreateFinalGameListDto
{
    [Required(ErrorMessage = "Informe o titulo.")]
    public string? Title { get; set; }
    public int? Year { get; set; }
    public string? Slug { get; set; }
    [Required(ErrorMessage = "Informe a URL social.")]
    [Url(ErrorMessage = "Informe uma URL valida.")]
    public string? SocialUrl { get; set; }
    [Required(ErrorMessage = "Informe ao menos uma tag.")]
    public string? Tags { get; set; }
    public bool ConsideredForAvgScore { get; set; }
    public bool Pinned { get; set; }
    public int PinnedPriority { get; set; }
    public int SocialComments { get; set; } = 0;
}

public class UpdateFinalGameListDto
{
    [Required(ErrorMessage = "Informe o titulo.")]
    public string? Title { get; set; }
    public int? Year { get; set; }
    [Url(ErrorMessage = "Informe uma URL valida.")]
    public string? SocialUrl { get; set; }
    [Required(ErrorMessage = "Informe ao menos uma tag.")]
    public string? Tags { get; set; }
    public bool ConsideredForAvgScore { get; set; }
    public bool Pinned { get; set; }
    public int PinnedPriority { get; set; }
    public int SocialComments { get; set; } = 0;
}
