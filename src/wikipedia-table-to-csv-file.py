from bs4 import BeautifulSoup
import requests
import csv
import sys

if len(sys.argv) < 3:
  print('two arguments are needed: [wikipedia url] [csv output name]')
  exit()

url = sys.argv[1]
csv_file = sys.argv[2]

response = requests.get(url)

soup = BeautifulSoup(response.content, "html.parser")

table = soup.find("table", attrs={"class": "wikitable"})

with open("../data/" + csv_file + ".csv", "w", newline="", encoding="utf-8") as csv_file:
  writer = csv.writer(csv_file, delimiter=',')
  
  table_header = []
  for row in table.find_all("th"):
    table_header.append(row.text.strip())

  writer.writerow(table_header)

  rowspan_size = 0
  rowspan_index = 0
  rowspan_value = ""
  for row in table.find_all("tr"):
    cells = row.find_all("td")
    if rowspan_size > 0:
      cells.insert(rowspan_index, rowspan_value)
      rowspan_size -= 1
    
    tds = []
    if (len(cells) > 0):
      for index, cell in enumerate(cells):
        if cell.has_attr('rowspan'):
          rowspan_size = int(cell.get('rowspan'))-1
          del cell['rowspan']
          rowspan_index = index
          rowspan_value = cell

        tds.append(cell.get_text().strip())
    
      writer.writerow(tds)