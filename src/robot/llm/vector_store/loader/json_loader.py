import json
from typing import List, Optional
from abc import ABC, abstractmethod
from langchain_core.documents import Document
from langchain_community.document_loaders.base import BaseLoader
from langchain_text_splitters import TokenTextSplitter
from .urls_loader import getPageDocuments

# Interface
class JsonConversionStrategy(ABC):
  @abstractmethod
  def convert(self, file_path: str, data: dict, meta_fields:Optional[list[str]] = []) -> List[Document]:
    pass

# Concrete Strategy: Event JSON Conversion
class EventStrategy(JsonConversionStrategy):
  def convert(self, file_path: str, data: dict, meta_fields:Optional[list[str]] = []) -> List[Document]:
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
                "abstract": item["description"],
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

    converted_data = event_converter(data)
    return self._create_documents(converted_data, file_path)

  def _create_documents(self, converted_data: List[dict], source: str) -> List[Document]:
    documents = []
    for item in converted_data:
      metadata = {
        "source": source,
        "title": item.get("title") or item.get("name"),
        "categories": f"{item.get('category', '')},{item.get('tags', '')}",
      }
      documents.append(Document(page_content=json.dumps(item), metadata=metadata))
    return documents

# Concrete Strategy: Poi JSON Conversion
class PoiStrategy(JsonConversionStrategy):
  def convert(self, file_path: str, data: dict, meta_fields:Optional[list[str]] = []) -> List[Document]:
    # Funzione per formattare la data
    def format_date(year, month, day):
        return f"{year}-{month:02d}-{day:02d}"
    def format_time(begin, end):
        return f"{begin} - {end}"
    def poi_converter(data):
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
                "title": item["name"],
                "abstract": item["description"],
                "place": f"{item['city']}, {item['address']}",
                "url": f"https://pesaro2024.it/experience-event/?id={item['id']}",
                "image": item["images"][0] if item.get("images") is not None  else "",
                "date": event_date,
                "time": event_time
            }
            json_output.append(output)

        return json_output

    converted_data = poi_converter(data)
    return self._create_documents(converted_data, file_path)

  def _create_documents(self, converted_data: List[dict], source: str) -> List[Document]:
    documents = []
    for item in converted_data:
      metadata = {
        "source": source,
        "title": item.get("title") or item.get("name"),
        "categories": f"{item.get('category', '')},{item.get('tags', '')}",
      }
      documents.append(Document(page_content=json.dumps(item), metadata=metadata))
    return documents

class LfoCardStrategy(JsonConversionStrategy):
  def convert(self, file_path: str, data: dict, meta_fields:Optional[list[str]] = []) -> List[Document]:
    def lfo_card_converter(data):
      json_output = []
      for item in data:
          # Estrapolazione dell'item di inizio dall'oggetto 'availability'
          if item.get("cardType") != "video":
              if len(item.get("cta")) > 0:
                  item["cta"] = item.get("cta")[0]
          json_output.append(item)
      return json_output
    converted_data = lfo_card_converter(data)
    documents = []
    for item in converted_data:
      metadata = {
        "source": file_path,
        "title": item.get("title"),
        "categories": item.get("categories"),
      }
      documents.append(Document(page_content=json.dumps(item), metadata=metadata))
    return documents

# Concrete Strategy: DefaultStrategy JSON Conversion
class DefaultStrategy(JsonConversionStrategy):
  def convert(self, file_path: str, data: dict, meta_fields:Optional[list[str]] = []) -> List[Document]:
      def __create(item, file_path) -> Document:
        _metadata = {  # type: ignore
          "source": file_path
        }
        if any(meta_fields): # type: ignore
          for field in meta_fields: # type: ignore
            if _p:=item.get(field):
              _metadata[field] = _p
        return Document(page_content=json.dumps(item),metadata=_metadata)
      if isinstance(data, list):
        return [__create(item, file_path) for item in data]
      else:
        return [__create(data, file_path)]

# Loader Class with Strategy Pattern
class JsonLoader(BaseLoader):

  # Dictionary to hold all agent strategies
  _list: dict[str,JsonConversionStrategy] ={
      "default": DefaultStrategy(),
      "event": EventStrategy(),
      "poi": PoiStrategy(),
      "cardItem": LfoCardStrategy(),
    }

  def __init__(self, file_path: str, meta_fields:Optional[list[str]] = [],encoding: Optional[str] = "utf-8"):
    self.file_path = file_path
    self.meta_fields = meta_fields
    self.encoding = encoding

  def load(self) -> List[Document]:
    """Carica e processa un file JSON, restituendo una lista di Document."""
    with open(self.file_path, "r", encoding=self.encoding) as file:
      data = json.load(file)
    if isinstance(data, list):
      return self._load_json_list(data)
    else:
      return self._load_json_object(data)

  def _load_json_object(self, data: dict) -> List[Document]:
    if urls := data.get("urls"):
          documents = getPageDocuments([url.get("url") for url in urls])
          return TokenTextSplitter().split_documents(documents)
    if json_type := data.get("type","default"):
      if strategy := self._list.get(json_type): # type: ignore
        return strategy.convert(self.file_path, data, self.meta_fields)

    return []

  def _load_json_list(self, data) -> List[Document]:
    """Carica una lista di oggetti JSON e usa la strategia corretta."""
    if not data or not data[0].get("type"):
      # Il primo elemento della lista non ha un tipo, quindi default a "catalog"
      json_type: str = "default"
    else:
      # Prendo il primo lemento della lista e ne estraggo il tipo
      json_type: str = data[0].get("type")
    if strategy := self._list.get(json_type):
      return strategy.convert(self.file_path, data, self.meta_fields)
    return []
