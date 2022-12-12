from bs4 import BeautifulSoup
import requests
import csv

url = "https://en.wikipedia.org/wiki/List_of_best-selling_PlayStation_video_games"

response = requests.get(url)

soup = BeautifulSoup(response.content, "html.parser")

table = soup.find("table", attrs={"class": "wikitable"})

with open("../data/best-selling-psone-games.csv", "w", newline="") as csv_file:
  writer = csv.writer(csv_file, delimiter=',')
  
  table_header = []
  for row in table.find_all("th"):
    table_header.append(row.text.strip())

  writer.writerow(table_header)

  for row in table.find_all("tr"):
    cells = row.find_all("td")
    
    tds = []
    if (len(cells) > 0):
      for cell in cells:
        tds.append(cell.get_text().strip())
    
      writer.writerow(tds)