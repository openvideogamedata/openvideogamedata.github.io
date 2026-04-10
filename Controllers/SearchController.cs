using community.Data;
using community.Dtos;
using community.Dtos.Search;
using community.Mappers.GameLists;
using community.Mappers.Games;
using community.Mappers.Users;
using community.Services;
using community.Utils;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly GameListService _gameListService;
    private readonly GameService _gameService;
    private readonly UserService _userService;

    public SearchController(
        GameListService gameListService,
        GameService gameService,
        UserService userService)
    {
        _gameListService = gameListService;
        _gameService = gameService;
        _userService = userService;
    }

    [HttpGet]
    public IActionResult Search(
        [FromQuery] string? input = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int maxPages = 5,
        [FromQuery] bool includeUsers = true)
    {
        var searchText = input ?? "";
        var loggedUser = _userService.GetLoggedUser();
        var userId = loggedUser?.Id ?? 0;

        var listFilters = new FilterListsCategory(page, pageSize, maxPages, new List<string>(), searchText);
        var (lists, listsPager) = _gameListService.GetAllListsCategories(listFilters, userId);

        var (games, gamesPager) = _gameService.GetGames(
            userId,
            page,
            searchText,
            pageSize: pageSize,
            maxPages: maxPages);

        var users = new List<community.Dtos.Users.UserSummaryDto>();
        object usersPager = new Pager(0, page, pageSize, maxPages);

        if (includeUsers && _userService.IsLogged())
        {
            var userFilters = new GeneralFilters(page, pageSize, maxPages, searchText);
            var (userResults, pager) = _userService.GetAll(
                userFilters.Page,
                userFilters.PageSize,
                userFilters.MaxPages,
                userFilters.SearchedText);

            users = userResults.Select(UserMapper.ToSummaryDto).ToList();
            usersPager = pager;
        }

        return Ok(new SearchResponse(
            searchText,
            new SearchResultSection<community.Dtos.GameLists.GameListCategoryDto>(
                lists.Select(GameListMapper.ToCategoryDto).ToList(),
                listsPager),
            new SearchResultSection<community.Dtos.Games.GameSummaryDto>(
                games.Select(GameMapper.ToSummaryDto).ToList(),
                gamesPager),
            new SearchResultSection<community.Dtos.Users.UserSummaryDto>(
                users,
                usersPager)));
    }
}
