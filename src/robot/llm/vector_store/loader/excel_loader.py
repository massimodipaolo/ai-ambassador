from langchain_core.documents import Document
from langchain_core.document_loaders import BaseLoader
from langchain_community.document_loaders import DataFrameLoader
import pandas as pd


class ExcelLoader(BaseLoader):

    def __init__(self, path: str, output_type: str="md"):
        self.path = path
        self.output_type=output_type

    def load(self) -> list[Document]:
        try:
          df = pd.read_excel(self.path)
          metadata = {
            "source": self.path,
          }
          try:
            name, filetype  = self.path.split("/")[-1].split(".")
            metadata["name"] = name
            metadata["filetype"] = filetype
          except:
            pass
          if "md" in self.output_type:
              content = df.to_markdown(index=True)
              return [Document(page_content=str(content), metadata=metadata)]
          elif "html" in self.output_type:
              content = df.to_html(index=True)
              return [Document(page_content=str(content), metadata=metadata)]
          else:
              content = df.to_string(index=True)
              return [Document(page_content=str(content), metadata=metadata)]
        except Exception as e:
          return [Document(page_content="Encriped", metadata={"source": self.path})]
