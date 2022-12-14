# Open Video Game Data

## About The Organization
Open Video Game Data is a non-profit organization created with the aim of democratizing access to information about the games industry in a totally open and free way.

One organization believes that democratizing access to game data is crucial for the growth and development of the industry, as well as for creating opportunities for players, developers and companies involved in the sector.

To achieve this goal, the organization works closely with the gaming community and companies, gathering and compiling data from sources that encourage it and making it available for free and accessible to all.

Over time, one organization hopes to build a comprehensive and reliable database on the gaming industry, making it a valuable resource for everyone involved in the industry.

## Getting Started

Install [Python](https://www.python.org/) and [Pip](https://pypi.org/project/pip/)

```bash
pip install -r requirements.txt
```

CSV Generate Example:
- First parameter: Script to be executed
- Second parameter: URL of the wikipedia page you want to extract the data from
- Third parameter: Name of the .csv file you want to generate
```bash
python wikipedia-table-to-csv-file.py https://en.wikipedia.org/wiki/List_of_best-selling_PlayStation_video_games best-selling-psone-games
```

Web Page Generate Example:
- First parameter: Script to be executed
- Second parameter: Name of the .csv file you want to use as base for the web page
- Third parameter: Title of the web page you want to generate
```bash
python page-generator.py best-selling-psone-games 'Best Selling Playstation 1 Games'
```