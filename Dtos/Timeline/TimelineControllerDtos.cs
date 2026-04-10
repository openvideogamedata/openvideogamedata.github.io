using community.Dtos.GameLists;

namespace community.Dtos.Timeline;

public sealed record TimelineGenerationDto(
    int Generation,
    string Title,
    List<GameListCategoryDto> Lists);
