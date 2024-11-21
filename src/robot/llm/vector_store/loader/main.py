from ws_bom_robot_app.llm.vector_store.loader.base import Loader, LoaderConfig
from .json_loader import JsonLoader
from .excel_loader import ExcelLoader

def init():
    Loader._list['.json'] = LoaderConfig(loader=JsonLoader)
    Loader._list['.xls'] = LoaderConfig(loader=ExcelLoader,kwargs={"output_type":"md"})
    Loader._list['.xlsx'] = LoaderConfig(loader=ExcelLoader,kwargs={"output_type":"md"})
