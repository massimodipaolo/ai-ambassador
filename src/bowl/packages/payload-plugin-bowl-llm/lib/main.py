from typing import List
from agent_lcel import AgentLcel
from agent_handler import AgentHandler
from langchain_core.messages import HumanMessage, AIMessage
from tools.tool_builder import get_allowed_tools
from utils.print import printString
import settings
import asyncio
import json
import os
import platform
import shutil
import sys


async def main() -> None:

    #with open("./temp.json", "w+") as f:
    #    f.write(sys.argv[1])
    
    #data = json.loads(open("./temp.json", "r").read())
    data = json.loads(sys.argv[1])
    secrets = data["secrets"]
    api_key = secrets["openAIApiKey"]
    messages = data["messages"]
    tools = data["appTools"]
    systemMessage = data["systemMessage"]
    threadId = data["threadId"]

    os.environ["LANGCHAIN_API_KEY"] = data["secrets"].get("langChainApiKey", "")
    os.environ["LANGCHAIN_PROJECT"] = data.get("langChainProject", "")
    os.environ["LANGCHAIN_TRACING_V2"] = str(data.get("langChainTracing", "")) # TODO: if  langChainApiKey == "", set to False


    async def decompress_zip(zip_file_path, extract_to):
        shutil.unpack_archive(zip_file_path, extract_to, "zip")
        os.remove(zip_file_path)

    #vectorDb = ""

    def getToolPath() -> List:
        return [tool["vectorDbFile"] for tool in tools]

    # Se esiste il file zip, decomprimo e elimino il file zip.
    # Se il file zip non esiste e la cartella non è vuota, utilizza la cartella come db
    
    """if vectorDb_path:
        vectorDb = os.path.join(
            os.path.dirname(vectorDb_path),
            os.path.splitext(os.path.basename(vectorDb_path))[0],
        )
        if os.path.exists(vectorDb_path):
            await decompress_zip(vectorDb_path, vectorDb)"""
    
    for zip_path in getToolPath(): 
        if os.path.exists(zip_path):
            await decompress_zip(zip_path, os.path.dirname(zip_path))


    settings.init()
    # chat_history = []
    for message in messages:
        if message["role"] == "user":
            settings.chat_history.append(HumanMessage(content=message["content"]))
        elif message["role"] == "assistant":
            settings.chat_history.append(AIMessage(content=message["content"]))

    processor = AgentLcel(
        apy_key=api_key,
        sys_message=systemMessage,
        tools=get_allowed_tools(tools=tools, api_key=api_key), #, vectorDb=vectorDb
    )

    await processor.executor.ainvoke(
        {"input": messages[-1], "chat_history": settings.chat_history},
        {"callbacks": [AgentHandler(threadId)]},
    )


if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(main())
