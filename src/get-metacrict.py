import requests
from bs4 import BeautifulSoup
import csv

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36'}
csv_file = 'metacrict-top-games'

def get_games(games_url):
    response = requests.get(games_url, headers=headers)

    if (response.status_code == 200):
        soup = BeautifulSoup(response.content, 'html.parser')
        trs = soup.find_all('tr', attrs={'class': None})

        games = []
        for tr in trs:
            game_score = int(tr.find('div', attrs={'class': 'metascore_w'}).text)

            game_title = tr.find('h3').text
            game_url = tr.find('a', attrs={'class': 'title'})['href']
            response = requests.get('https://www.metacritic.com' + game_url, headers=headers)
            
            if (response.status_code == 200):
                soup = BeautifulSoup(response.content, 'html.parser')
                critics = soup.find('span', attrs={'class': 'based' }).findNext('span').text.strip()
                
                game = {
                    'game-title': game_title,
                    'game-score': game_score,
                    'number-of-critics': critics
                }

                games.append(game)

    return games

with open("../data/" + csv_file + ".csv", "w", newline="") as csv_file:
    writer = csv.writer(csv_file, delimiter=',')

    games = get_games('https://www.metacritic.com/browse/games/score/metascore/all/all/filtered')

    writer.writerow(['Game Title', 'Game Score', 'Number of Critics'])

    for game in games:
        writer.writerow([game['game-title'], game['game-score'], game['number-of-critics']])