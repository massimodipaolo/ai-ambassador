from ws_bom_robot_app import main
from llm.tools.main import init as init_tools
from llm.vector_store.integration.main import init as init_integration
from llm.vector_store.loader.main import init as init_loader

init_tools()
init_integration()
init_loader()

app = main.app
