import csv
from datetime import datetime
import os

html = ''
csv_file_name = 'the-game-awards'

with open('../template/header.txt') as file:
    html += file.read()

with open('../data/' + csv_file_name + '.csv', newline='') as csvfile:
    spamreader = csv.reader(csvfile, delimiter=',')
    html += '<table>'
    for row in spamreader:
        html += '<tr>'
        for item in row:
            html += '<td>' + item + '</td>'

        html += '</tr>'
    html += '</table>'

html += '<p>Last Updated: ' + str(datetime.now()) + '</p>'
html += '<p>Data source: <a href="../data/' + csv_file_name + '.csv">' + csv_file_name + '.csv</a></p>'
html += '</body></html>'

file_url = '../pages/' + csv_file_name + '.html'

if os.path.exists(file_url):
  os.remove(file_url)

file = open(file_url, "a")
file.write(html)
file.close()