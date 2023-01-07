import csv
from datetime import datetime
import os
import sys

if len(sys.argv) < 3:
  print('two arguments are needed: [csv input name] [page title]')
  exit()

csv_file_name = sys.argv[1]
page_header = sys.argv[2]
html = ''

with open('../template/header.txt') as file:
    html += file.read()

html += '<h1>'+page_header+'</h1>'
with open('../data/' + csv_file_name + '.csv', newline='', encoding="utf-8") as csvfile:
    spamreader = csv.reader(csvfile, delimiter=',')
    html += '<table>'
    for row in spamreader:
        html += '<tr>'
        for item in row:
            if 'https' in item:
                html += '<td><a href="'+ item +'">link</a>'
            else:
                html += '<td>' + item + '</td>'

        html += '</tr>'
    html += '</table>'

html += '<p>Last Updated: ' + str(datetime.now()) + '</p>'
html += '<p>Data source: <a href="../data/' + csv_file_name + '.csv">' + csv_file_name + '.csv</a></p>'
html += '</body></html>'

file_url = '../pages/' + csv_file_name + '.html'

if os.path.exists(file_url):
  os.remove(file_url)

file = open(file_url, "a", encoding="utf-8")
file.write(html)
file.close()