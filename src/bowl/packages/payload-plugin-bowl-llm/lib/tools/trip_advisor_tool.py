import re
from typing import List
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.runnables import RunnablePassthrough
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate


class RestaurantItem(BaseModel):
    """Restaurant item for the response."""

    id: int = Field(description="ID of the restaurant, should be a string.")
    title: str = Field(
        description="Name of the restaurant, should be a string.", default=""
    )
    rating: float = Field(
        description="Rating of the restaurant, should be a float number.", default=0.0
    )
    reviews: int = Field(description="Number of reviews, should be a int.", default=0)
    priceRange: str = Field(
        description="Price range, should be a string. (ES: 'priceRange': '€€ - €€€',)",
        default="",
    )
    cuisine: str = Field(description="Cuisine type, should be a string.", default="")
    address: str = Field(
        description="Address of the restaurants, should be a string.", default=""
    )
    url: str = Field(
        description="URL of the restaurant web_url, should be a string.", default=""
    )
    book: str = Field(
        description="Booking URL of the restaurant web_url, should be a string.",
        default="",
    )
    image: str = Field(description="Image URL, should be a string.", default="")

    @validator("*")
    @classmethod
    def validate_field(cls, v):
        if isinstance(v, str):
            pattern = re.compile(r"[\"\\\b\f\n\r\t\u0000-\u001F\\\\\xa0]")
            str_modified = pattern.sub("", v)
            return str_modified
        return v


class RestaurantItems(BaseModel):
    """Final response to the question being asked."""

    items: List[RestaurantItem] = Field(description="List of RestaurantItem.")


class RestaurantToolWrapper:
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
        """Get the JSON output parser configured for `RestaurantItems`."""
        return PydanticOutputParser(pydantic_object=RestaurantItems)

    def __create_prompt(self):
        """Create a prompt template for querying."""
        return PromptTemplate(
            template="""Answer the user query in the best wat you can. Get always the id of the restaurant that you found in context for each RestaurantItem.\
                Same for title, rating, reviews, princeRange, cuisine, address, url, book and image.\
                You cant find 'id' value from 'location_id' key in the context.\
                You can find 'address' value from 'address_obj' key in the following context.\
                Use the 'utf-8' encoding\
                RETRIVE ONLY THE JSON OBJECTS WITH KEY 'type' EQUAL TO 'tripadvisor'\
                The following is the context that you have to use for the query in JSON FORMAT:\
                \n{context}\n\
                Follow this json schema for the respose output: {format_instructions}\n\
                Query: {query}\n""",
            input_variables=["query"],
            partial_variables={
                "format_instructions": self.__output_parser.get_format_instructions()
            },
        )

    def __create_chain(self):
        """Create the processing chain for resturants searching."""
        model = ChatOpenAI(
            api_key=self.__apy_key, model="gpt-4-0125-preview"  # "gpt-4-0125-preview"
        )
        return (
            {"context": self.__load_retriever(), "query": RunnablePassthrough()}
            | self.__create_prompt()
            | model
            | self.__output_parser
        )
