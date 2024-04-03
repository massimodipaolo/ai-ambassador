from tools.event_tool import EventToolWrapper, EventItems
from tools.poi_tool import PoiToolWrapper, PoiItems
from tools.trip_advisor_tool import RestaurantToolWrapper, RestaurantItems
from langchain.tools.retriever import create_retriever_tool
from langchain_openai import OpenAIEmbeddings
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor
from langchain_openai import OpenAI
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain.tools import tool
from utils.print import printJson, printString
import json, os


def get_allowed_tools(tools: list, api_key: str) -> list:  # , vectorDb: str

    def getVectorDbPath(func_name) -> str:
        for tool in tools:
            if tool.get("functionName") == func_name:
                return os.path.dirname(tool["vectorDbFile"])
        return ""

    def getWaitingMessage(func_name) -> str:
        for tool in tools:
            if tool.get("functionName") == func_name:
                return tool["waitingMessage"]
        return "Loading ..."

    @tool("document_retriever")
    def document_retriever(query: str):
        """search and return information about websolute procedures for project managers, sales, strategists, and all operations people"""
        retriever=FAISS.load_local(
            getVectorDbPath("document_retriever"), OpenAIEmbeddings(api_key=api_key)
        ).as_retriever()
        return retriever.invoke(query)

    class EventInput(BaseModel):
        query: str = Field(
            description="search query for events. Should be one or more keyword reparated by comma."
        )

    @tool("knowledge-events-experiences", args_schema=EventInput)
    def search_events(query: str) -> str:
        """Search and retrieve events from the knowledge base."""
        printString(getWaitingMessage(func_name="knowledge-events-experiences"))
        vectorDb = getVectorDbPath(func_name="knowledge-events-experiences")
        chain = EventToolWrapper(api_key, vectorDb)
        response: EventItems = chain.tool_executor.invoke(query)
        if len(response.items) == 0:
            return "I could not find any information to answer your question. Please try again with a different question."
        for item in response.items:
            item_json = item.json()
            item_data = json.loads(item_json.encode("utf-8"))
            if len(response.items) > 1:
                item_data["type"] = "eventItem"
            else:
                item_data["type"] = "event"
            printJson(item_data)
        return "Introduction to the content of the answer in the best way you can ALWAYS WITHOUT the information context retrived. DO NOT ANSWER WITH THE INFORMATION RETRIEVED"  # response.json()

    class PoiInput(BaseModel):
        query: str = Field(
            description="search query for poi. Should be one or more keyword reparated by comma."
        )

    @tool("knowledge-points-of-interest", args_schema=PoiInput)
    def search_points_of_interest(query: str) -> str:
        """Search and retrieve points of interest (POI) from the knowledge base."""
        printString(getWaitingMessage(func_name="knowledge-points-of-interest"))
        vectorDb = getVectorDbPath(func_name="knowledge-points-of-interest")
        chain = PoiToolWrapper(api_key, vectorDb)
        response: PoiItems = chain.tool_executor.invoke(query)
        for item in response.items:
            item_json = item.json()
            item_data = json.loads(item_json.encode("utf-8"))
            if len(response.items) > 1:
                item_data["type"] = "poiItem"
            else:
                item_data["type"] = "poi"
            printJson(item_data)
        return "Introduction to the content of the answer in the best way you can ALWAYS WITHOUT the information context retrived. DO NOT ANSWER WITH THE INFORMATION RETRIEVED"  # response.json()

    class RestaurantsInput(BaseModel):
        query: str = Field(
            description="search query for retaurants. Should be one or more keyword reparated by comma."
        )

    @tool("knowledge-restaurants-locals", args_schema=RestaurantsInput)
    def search_restaurant_locals(query: str) -> str:
        """Search and retrieve restaurant and locals from the knowledge base."""
        printString(getWaitingMessage(func_name="knowledge-restaurants-locals"))
        vectorDb = getVectorDbPath(tools, "knowledge-restaurants-locals")
        chain = RestaurantToolWrapper(api_key, vectorDb)
        response: RestaurantItems = chain.tool_executor.invoke(query)
        for item in response.items:
            item_json = item.json()
            item_data = json.loads(item_json.encode("utf-8"))
            if len(response.items) > 1:
                item_data["type"] = "tripadvisorItem"
            else:
                item_data["type"] = "tripadvisor"
            printJson(item_data)
        return "Introduction to the content of the answer in the best way you can ALWAYS WITHOUT the information context retrived. DO NOT answer WITH THE INFORMATION RETRIEVED"  # response.json()

    tools_name = [tool["functionName"] for tool in tools]

    all_tools = [
        search_events,
        search_points_of_interest,
        search_restaurant_locals,
        document_retriever
    ]

    return [
        tool_allowed for tool_allowed in all_tools if tool_allowed.name in tools_name
    ]
