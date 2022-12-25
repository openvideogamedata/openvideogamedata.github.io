import requests
import json
import sys
import csv


games = [{'name': 'Halo 5: Guardians', 'copies': '0.0m'}]
YOUR_CLIENT_ID = ''
YOUR_APP_ACCESS_TOKEN = ''


def get_top_3(csv_file_name):
    top_3_games = []
    with open('../data/' + csv_file_name + '.csv', newline='') as csvfile:
        spamreader = csv.reader(csvfile, delimiter=',')
        top = 0
        for row in spamreader:
            if top <= 3 and top != 0:
                top_3_games.append({'name': row[0], 'copies': row[1]})
            top += 1
    return top_3_games

def log_on_api(access_token):
    base_url = 'https://id.twitch.tv/oauth2/token'
    url = f'{base_url}?client_id={YOUR_CLIENT_ID}&client_secret={YOUR_APP_ACCESS_TOKEN}&grant_type=client_credentials'
    
    if (access_token == ''):
        result = requests.post(url)

        if result.status_code == 200:
            json_text = json.loads(result.text)
            access_token = json_text["access_token"]
            return access_token
    return access_token

def get_game_cover_by_name(returned_token, game_name):
    raw_data = f'fields name, cover.url, cover.image_id; search "{game_name}"; where name~"{game_name}"; limit 1;'
    Headers = { 'Authorization' : 'Bearer ' + returned_token, 'Client-ID' : YOUR_CLIENT_ID }
    response = requests.post('https://api.igdb.com/v4/games', headers=Headers, data=raw_data)

    if response.status_code == 200:
        json_text = json.loads(response.text)
        if json_text:
            cover_id = json_text[0]['cover']['image_id']
            cover_url = f'https://images.igdb.com/igdb/image/upload/t_cover_big/{cover_id}.jpg'
            return cover_url

def main():
    html = ''
    access_token = ''
    returned_token = log_on_api(access_token)

    for game in games:
        cover_url = get_game_cover_by_name(returned_token, game["name"])
        html += f'<div class="game-card">\n<img class="game-card-cover" src="{cover_url}" alt="{game["name"]}" height="176" width="132">\n<h5 class="game-card-title">{game["name"]}</h5>\n<p class="game-card-description">Copies sold: {game["copies"]}</p>\n</div>\n'

    print(html)


if len(sys.argv) > 1:
    games = get_top_3(sys.argv[1])

main()