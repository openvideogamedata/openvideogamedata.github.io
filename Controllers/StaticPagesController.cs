using community.Dtos.StaticPages;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/pages")]
public class StaticPagesController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public StaticPagesController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpGet("about")]
    public async Task<IActionResult> GetAbout()
    {
        var aboutPath = Path.Combine(_environment.WebRootPath, "about.txt");
        var content = System.IO.File.Exists(aboutPath)
            ? await System.IO.File.ReadAllTextAsync(aboutPath)
            : "";

        return Ok(new StaticPageDto("about", "About", content));
    }

    [HttpGet("privacy")]
    public IActionResult GetPrivacy()
    {
        return Ok(new StaticPageDto(
            "privacy",
            "Privacy",
            "Privacy page content is still rendered by the Blazor page during the smooth migration."));
    }
}
