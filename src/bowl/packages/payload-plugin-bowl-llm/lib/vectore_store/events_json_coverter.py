import json, requests

#response = requests.get("https://api.pesaro.entourance.com/api/public/experience") 
#data = response.json()
#data = open("test_json.json", "r").read()
#data = json.loads(data)

# Funzione per formattare la data
def format_date(year, month, day):
    return f"{year}-{month:02d}-{day:02d}"

def format_time(begin, end):
    return f"{begin} - {end}"

def event_converter(data):
    json_output = []

    for item in data:
        # Estrapolazione dell'item di inizio dall'oggetto 'availability'
        if len(item["availability"]) > 0:
            availability = item["availability"][0]

            if len(availability.get("days")) > 0:
                begin_date = availability.get("days")[0]
                event_date = format_date(begin_date["year"], begin_date["begin"]["month"], begin_date["begin"]["day"])
            else:
                event_date = ""
            if len(availability.get("hours")) > 0 :
                time = availability["hours"][0]
                event_time = format_time(time["begin"], time["end"])
            else:
                event_time = ""
        else:
            event_date = ""
            event_time = ""
            
        # Estrapolazione e ristrutturazione dei dati nel formato desiderato
        output = {
            "id": item["id"],
            "title": item["title"],
            "abstract": item["description"], #next((trans["description"] for trans in item["translations"] if trans["language"] == "en_EN"), ""),
            "place": f"{item['city']}, {item['address']}",
            "url": f"https://pesaro2024.it/experience-event/?id={item['id']}",
            "image": item["images"][0],
            "date": event_date,
            "time": event_time
        }
        json_output.append(output)
    
    
    # Salva il risultato
    with open("output_events.json", "w") as f:
        f.write(json.dumps(json_output, indent=4))
    return json_output