import re
from typing import List
from datetime import datetime
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.runnables import RunnablePassthrough
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate


class PoiItem(BaseModel):
    """Point of interest (POI) item for the response."""

    id: int = Field(
        description="'poi_id' of the retrieved point of interest from the knowledge base. Do not create a new one.",
        default="",
    )
    title: str = Field(
        description="Title of the point of interest in the knowledge base.", default=""
    )
    abstract: str = Field(
        description="Description of the point of interest in the knowledge base.",
        default="",
    )
    place: str = Field(
        description="Place where the point of interest is located in the knowledge base.",
        default="",
    )
    url: str = Field(
        description="URL of the point of interest structured in this way: https://pesaro2024.it/poi/?id={id}. The id is the 'poi_id' of the poi in the knowledge base.",
    )
    image: str = Field(
        description="URL of the image of the event from the key: 'images'[0], should be a string url.",
        default="",
    )
    time: str = Field(
        description="Time of the point of interest in the knowledge base.", default=""
    )

    @validator("*")
    @classmethod
    def validate_field(cls, v):
        if isinstance(v, str):
            pattern = re.compile(r"[\"\\\b\f\n\r\t\u0000-\u001F\\\\\xa0]")
            str_modified = pattern.sub("", v)
            return str_modified
        return v


class PoiItems(BaseModel):
    """Final response model containing a list of points of interest."""

    items: List[PoiItem] = Field(description="List of PoiItem")


class PoiToolWrapper:

    def __init__(self, apy_key: str, vectorDb: str):
        self.__output_parser = self.__get_parser()
        self.__apy_key = apy_key
        self.__vectorDb = vectorDb
        self.tool_executor = self.__create_chain()

    def __load_retriever(self):
        """Load the FAISS retriever with OpenAI embeddings."""
        vectorDB = FAISS.load_local(
            self.__vectorDb, OpenAIEmbeddings(api_key=self.__apy_key)
        )
        return vectorDB.as_retriever(search_kwargs={"k" : 6})

    def __get_parser(self):
        """Get the JSON output parser configured for `PoiItems`."""
        return PydanticOutputParser(pydantic_object=PoiItems)

    def __create_prompt(self):
        """Create a prompt template for querying."""
        return PromptTemplate(
            template="""Answer the user query in the best wat you can. Get ALWAYS the id of the poi that you found in context for each PoiItem.\
                Same for place, url, image, date and time. The value of key ID CAN'T BE NULL.\
                You cant find 'id' value from 'poi_id' key in the context.\
                You can find 'date' and 'time' value from 'availability' key in the following context.\
                Use the 'utf-8' encoding\
                RETRIVE ONLY THE JSON OBJECTS WITH KEY 'type' EQUAL TO 'poi'\
                If not specified respond ONLY with future events per day {date_time} spcified in this fomra: Y-m-d .\
                The following is the context that you have to use for the query in JSON FORMAT:\
                \n{context}\n\
                Follow this json schema for the respose output: {format_instructions}\
                Make sure you fill ALL the json schema passed withe the value retrieved.
                The "url" key should be filled with the following url: https://pesaro2024.it/poi/?id="id of the events"\
                \nQuery: {query}\n""",
            input_variables=["query"],
            partial_variables={
                "format_instructions": self.__output_parser.get_format_instructions(),
                "date_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            },
        )

    def __create_chain(self):
        """Create the processing chain for event searching."""
        model = ChatOpenAI(
            api_key=self.__apy_key, model= "gpt-4-0125-preview"
        )

        return (
            {"context": self.__load_retriever(), "query": RunnablePassthrough()}
            | self.__create_prompt()
            | model
            | self.__output_parser
        )
