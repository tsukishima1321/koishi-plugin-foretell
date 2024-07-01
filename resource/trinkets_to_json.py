import json

# Read the text file
with open('trinkets.txt', 'r', encoding='utf-8') as file:
    lines = file.readlines()


data = {"trinkets": [None]*189}
for line in lines:
    single = {
        "id": line.split("\"")[1].strip(),
        "name": line.split("\"")[3].strip(),
        "des": line.split("\"")[5].strip()
    }
    data["trinkets"][int(line.split("\"")[1].strip())-1] = single

# Write the data to a JSON file
with open('output.json', 'w', encoding='utf-8') as json_file:
    json.dump(data, json_file, ensure_ascii=False, indent=4)
