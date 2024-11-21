from ws_bom_robot_app.llm.vector_store.integration.manager import IntegrationManager
from .sharepoint import Sharepoint

def init():
  IntegrationManager._list["llmkbsharepoint"] = Sharepoint
