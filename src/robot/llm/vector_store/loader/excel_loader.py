from langchain_core.documents import Document
from langchain_core.document_loaders import BaseLoader
import pandas as pd


class ExcelLoader(BaseLoader):

    def __init__(self, path: str, output_type: str="md"):
        self.path = path
        self.output_type=output_type

    def load(self) -> list[Document]:
        df = pd.read_excel(self.path)
        name, filetype  = self.path.split("/")[-1].split(".")
        metadata = {
            "source": self.path,
            "name": name,
            "filetype": filetype
        }
        if "md" in self.output_type:
            content = df.to_markdown(index=True)
            return [Document(page_content=str(content), metadata=metadata)]
        elif "html" in self.output_type:
            content = df.to_html(index=True)
            return [Document(page_content=str(content), metadata=metadata)]
        else:
            content = df.to_string(index=True)
            return [Document(page_content=str(content), metadata=metadata)]
