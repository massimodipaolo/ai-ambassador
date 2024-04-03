import json
from typing import List
from events_json_coverter import event_converter
from poi_json_converter import poi_converter
from langchain_core.documents import Document

from langchain_community.document_loaders.base import BaseLoader

class MyLoader(BaseLoader):
    def __init__(
        self,
        file_path: str,
        encoding: str = "utf-8" or None,
    ):
        self.file_path = file_path
        self.encoding = encoding

    def load(self) -> List[Document]:
        documents = []
        try:
            file = json.loads(open(self.file_path, "r", encoding=self.encoding).read())
            if file[0].get("type") == "event":
                file = event_converter(file)
            if file[0].get("type") == "poi":
                file = poi_converter(file)

        except Exception as e:
            raise RuntimeError(f"Error loading {self.file_path}") from e
        for item in file:
            metadata = {"source": self.file_path,
                        "title": item.get("title") if item.get("title") else item.get("name"),
                        "categories": f"{item.get('category')},{item.get('tags')}"
            }
            documents.append(Document(page_content=json.dumps(item), metadata=metadata))
        return documents
