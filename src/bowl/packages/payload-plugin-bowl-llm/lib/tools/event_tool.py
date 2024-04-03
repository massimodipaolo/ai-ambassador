import re
from typing import List
from datetime import datetime
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.runnables import RunnablePassthrough
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate


class EventItem(BaseModel):
    """Event item for the response."""

    id: int = Field(description="ID of the event, should be a string.")
    title: str = Field(
        description="Title of the event, should be a string.", default=""
    )
    description: str = Field(
        description="Description of the event, should be a string.", default=""
    )
    place: str = Field(
        description="Place where the event is held, should be a string.", default=""
    )
    url: str = Field(
        description="URL of the experience structured in this way: https://pesaro2024.it/experience-event/?id={id}. The id is the 'experience_id' of the event in the knowledge base.",
    )
    image: str = Field(
        description="URL of the image of the event from the key: 'images'[0], should be a string url.",
        default="",
    )
    date: str = Field(
        description="Date of the event retrived from the 'availability' key in context, should be a string.",
        default="",
    )
    time: str = Field(
        description="Time of the event retrived from the 'availability' key in context, should be a string.",
        default="",
    )

    """@validator("*")
    @classmethod
    def validate_field(cls, v):
        if isinstance(v, str):
            pattern = re.compile(r"[\"\\\b\f\n\r\t\u0000-\u001F\\\\\xa0]")
            str_modified = pattern.sub("", v)
            return str_modified
        return v"""


class EventItems(BaseModel):
    """Final response to the question being asked."""

    items: List[EventItem] = Field(description="List of EventItem.")


class EventToolWrapper:
    def __init__(self, api_key: str, vectorDb: str):
        self.__output_parser = self.__get_parser()
        self.__api_key = api_key
        self.__vectorDb = vectorDb
        self.tool_executor = self.__create_chain()

    def __load_retriever(self):
        """Load the FAISS retriever with OpenAI embeddings."""
        vectorDB = FAISS.load_local(
            self.__vectorDb, OpenAIEmbeddings(api_key=self.__api_key)
        )
        return vectorDB.as_retriever()  # search_kwargs={"k": 20}

    def __get_parser(self):
        """Get the JSON output parser configured for `EventItems`."""
        return PydanticOutputParser(pydantic_object=EventItems)

    def __create_prompt(self):
        """Create a prompt template for querying."""
        return PromptTemplate(
            template="""Your task is retrive events from the context.
                If a date IS NOT specified in the Query, return only events with date afer: "{date_time}" specified in this format: Y-m-d .\
                The following is the context that you have to use for the query in JSON FORMAT:\
                \n{context}\n\
                Follow this json schema for the respose output: {format_instructions}\n\
                Query: {query}\n""",
            input_variables=["query"],
            partial_variables={
                "format_instructions": self.__output_parser.get_format_instructions(),
                "date_time": datetime.now().strftime("%Y-%m-%d"),  # %H:%M:%S
            },
        )

    def __create_chain(self):
        """Create the processing chain for event searching."""
        model = ChatOpenAI(
            api_key=self.__api_key, model="gpt-4-0125-preview", verbose=False
        )
        return (
            {"context": self.__load_retriever(), "query": RunnablePassthrough()}
            | self.__create_prompt()
            | model
            | self.__output_parser
        )


#  Get alwayes the id of the event that you found in context for each EventItem.\
