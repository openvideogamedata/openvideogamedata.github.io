using System.Text;
using community.Data;
using community.Dtos.GameLists;
using community.Mappers.GameLists;
using community.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace community.Controllers;

[ApiController]
[Route("api/source-lists")]
public class SourceListsController : ControllerBase
{
    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    private readonly UserService _userService;

    public SourceListsController(
        IDbContextFactory<ApplicationDbContext> factory,
        UserService userService)
    {
        _factory = factory;
        _userService = userService;
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var sourceList = await GetSourceList(id);
        if (sourceList is null)
        {
            return NotFound();
        }

        var userLogged = _userService.GetLoggedUser();
        var comparison = userLogged is not null
            && sourceList.UserContributed is not null
            && userLogged.Id != sourceList.UserContributed.Id
                ? await _userService.CompareListsIfFriends(sourceList.UserContributed.Id, userLogged.Id, sourceList)
                : null;

        return Ok(new
        {
            list = GameListMapper.ToGameListDto(sourceList),
            creator = GetListCreator(sourceList),
            creatorNickname = GetListCreatorNickname(sourceList),
            canEdit = CanEdit(sourceList, userLogged),
            friendComparison = comparison is null
                ? null
                : new
                {
                    comparison.UserComparingListId,
                    comparison.CompatibilityPercentage,
                    comparison.CoincidentGameIds
                }
        });
    }

    [HttpGet("{id:long}/csv")]
    public async Task<IActionResult> GetCsv(long id)
    {
        var sourceList = await GetSourceList(id);
        if (sourceList is null)
        {
            return NotFound();
        }

        var csv = BuildCsv(sourceList);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", $"{GetListCreator(sourceList)} - {DateTime.Now:yyyy-MM-dd_HH-mm-ss}.csv");
    }

    [Authorize]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        using var context = _factory.CreateDbContext();
        var sourceList = await context.GameLists
            .Include(gameList => gameList.Items)
            .FirstOrDefaultAsync(gameList => gameList.Id == id);

        if (sourceList is null)
        {
            return NotFound();
        }

        var userLogged = _userService.GetLoggedUser();
        if (!CanEdit(sourceList, userLogged))
        {
            return Forbid();
        }

        context.Items.RemoveRange(sourceList.Items);
        context.GameLists.Remove(sourceList);
        await context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<GameList?> GetSourceList(long id)
    {
        using var context = _factory.CreateDbContext();
        return await context.GameLists
            .Include(gameList => gameList.FinalGameList)
            .Include(gameList => gameList.Source)
            .Include(gameList => gameList.UserContributed)
            .Include(gameList => gameList.Items)
            .ThenInclude(item => item.Game)
            .FirstOrDefaultAsync(gameList => gameList.Id == id);
    }

    private static string BuildCsv(GameList sourceList)
    {
        var sb = new StringBuilder();
        sb.Append($"Position,Title,ReleaseDate,ExternalId,Score,GameId,CoverImageId{Environment.NewLine}");

        foreach (var item in sourceList.Items.OrderBy(i => i.Position))
        {
            var title = item.GameTitle ?? item.Game?.Title ?? string.Empty;
            var releaseDate = item.Game?.FirstReleaseDate.ToString("yyyy-MM-dd") ?? string.Empty;
            var externalId = item.Game?.ExternalId.ToString() ?? string.Empty;
            var coverImageId = item.Game?.ExternalCoverImageId ?? string.Empty;
            sb.Append($"{item.Position},{title},{releaseDate},{externalId},{item.Score},{item.GameId},{coverImageId}{Environment.NewLine}");
        }

        return sb.ToString();
    }

    private static string GetListCreator(GameList? gameList)
    {
        if (gameList?.Source is not null)
        {
            return gameList.Source.Name;
        }

        if (gameList?.UserContributed is not null)
        {
            return gameList.UserContributed.FullName;
        }

        return "Not Found!";
    }

    private static string GetListCreatorNickname(GameList? gameList)
    {
        return gameList?.Source is null && gameList?.UserContributed is not null
            ? gameList.UserContributed.Nickname
            : "";
    }

    private static bool CanEdit(GameList sourceList, User? userLogged)
    {
        return userLogged?.Id == sourceList.UserContributedId || userLogged?.Role == "admin";
    }
}
