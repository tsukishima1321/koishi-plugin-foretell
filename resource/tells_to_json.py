import json

# Read the text file
with open('tells.txt', 'r', encoding='utf-8') as file:
    lines = file.readlines()

# Create a list of dictionaries for English and Chinese phrases
data = {"tells": []}
for i in range(0, len(lines), 2):
    entry = {
        "en": lines[i].strip(),
        "ch": lines[i+1].strip()
    }
    data["tells"].append(entry)

# Write the data to a JSON file
with open('output.json', 'w', encoding='utf-8') as json_file:
    json.dump(data, json_file, ensure_ascii=False, indent=4)
