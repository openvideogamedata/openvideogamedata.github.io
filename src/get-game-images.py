import requests
import json

YOUR_CLIENT_ID = ''
YOUR_APP_ACCESS_TOKEN = ''

def log_on_api(access_token):
    base_url = 'https://id.twitch.tv/oauth2/token'
    url = f'{base_url}?client_id={YOUR_CLIENT_ID}&client_secret={YOUR_APP_ACCESS_TOKEN}&grant_type=client_credentials'
    
    if (access_token == ''):
        result = requests.post(url)

        if result.status_code == 200:
            json_text = json.loads(result.text)
            access_token = json_text["access_token"]
            return access_token

def get_game_cover_by_name(returned_token, game_name):
    raw_data = f'fields name, cover.url, cover.image_id; search "{game_name}"; limit 1;'
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
    games = ['Grand Theft Auto V', 'Wii Sports', 'PUBG: Battlegrounds', 'Super Mario Bros.']
    access_token = ''
    returned_token = log_on_api(access_token)

    for game in games:
        cover_url = get_game_cover_by_name(returned_token, game)
        html += f'<img src="{cover_url}" alt="{game}" width="264" height="352">'

    print(html)

main()