import os;

link = "http://media.blizzard.com/heroes/images/battlegrounds/maps/haunted-mines-v2/underground/6/"

column = 0;
rc_column = 0;
while (rc_column == 0):
	row = 0;
	rc_column = os.system('wget ' + link + str(column) + '/' + str(row) + '.jpg -O ' + str(1000 + column) + '-' + str(1000 + row) + '.jpg')
	rc_row = rc_column
	while (rc_row == 0):
		row += 1
		rc_row = os.system('wget ' + link + str(column) + '/' + str(row) + '.jpg -O ' + str(1000 + column) + '-' + str(1000 + row) + '.jpg')

	column += 1
	
p = os.popen('ls -1 *.jpg | tail -n2');
second_last_file = p.readline();
last_file = p.readline();

column_end = last_file[0:4]
row_end = second_last_file[5:9]

print column_end
print row_end

os.system('rm ' + column_end + '*');
os.system('rm *-' + row_end + '.jpg');

column_end = int(column_end) - 1000;
row_end = int(row_end) - 1000;

os.system('mkdir temp')

i = 0;
for r in range(0, row_end):
	for c in range(0, column_end):
		file_to_move = str(1000 + c) + '-' + str(1000 + row_end - r - 1) + '.jpg'
		os.system('cp ' + file_to_move + ' ./temp/' + str(100000 + i) + '.jpg');
		i += 1

os.system('montage ./temp/*.jpg -tile ' + str(column_end) + 'x' + str(row_end) + ' -geometry +0+0 result.png');
os.system('montage ./temp/*.jpg -tile ' + str(column_end) + 'x' + str(row_end) + ' -geometry +0+0 result.jpg');
os.system('rm temp -r');
os.system('rm 1*.jpg');

