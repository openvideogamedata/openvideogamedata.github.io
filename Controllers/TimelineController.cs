using community.Data;
using community.Dtos.Timeline;
using community.Mappers.GameLists;
using Microsoft.AspNetCore.Mvc;

namespace community.Controllers;

[ApiController]
[Route("api/timeline")]
public class TimelineController : ControllerBase
{
    private static readonly Dictionary<int, List<long>> GenerationListIds = new()
    {
        { 1, new List<long>() },
        { 2, new List<long> { 4 } },
        { 3, new List<long> { 5, 57 } },
        { 4, new List<long> { 7, 6, 69 } },
        { 5, new List<long> { 8, 9, 65 } },
        { 6, new List<long> { 10, 11, 12, 13, 72 } },
        { 7, new List<long> { 16, 15, 14, 70, 71 } },
        { 8, new List<long> { 19, 87, 20, 18, 17, 56, 21, 75, 88 } },
        { 9, new List<long> { 23, 22, 59, 54, 82 } }
    };

    private readonly GameListService _gameListService;

    public TimelineController(GameListService gameListService)
    {
        _gameListService = gameListService;
    }

    [HttpGet]
    public IActionResult GetTimeline([FromQuery] int? generation = null)
    {
        var selectedGenerations = generation is null
            ? GenerationListIds
            : GenerationListIds.Where(item => item.Key == generation.Value);

        var response = selectedGenerations
            .Select(item => new TimelineGenerationDto(
                item.Key,
                $"Generation {item.Key}",
                item.Value
                    .Select(_gameListService.GetById)
                    .Where(list => list is not null)
                    .Select(list => GameListMapper.ToCategoryDto(list!))
                    .ToList()))
            .ToList();

        if (generation is not null && response.Count == 0)
        {
            return NotFound();
        }

        return Ok(response);
    }
}
