import re, os
from typing import List
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.runnables import RunnablePassthrough
from pydantic import BaseModel, Field
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnableLambda
import json
from ws_bom_robot_app.llm.models.api import LlmAppTool

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
    def __init__(self, apy_key: str, tool: LlmAppTool):
        self.prompt = tool.llm_chain_settings.prompt or ""
        self.temperature = tool.llm_chain_settings.temperature or 0
        self.rulesDbPath = tool.rules_vector_db or ""
        openai_model = tool.model or "gpt-4o"
        self.model = ChatOpenAI(
            api_key=self.__apy_key,
            model=openai_model,
            temperature=self.temperature
        )
        self.__output_parser = self.__get_parser()
        self.embeddings = OpenAIEmbeddings(api_key=apy_key)
        self.__apy_key = apy_key
        self.__vectorDb = tool.vector_db or ""
        self.tool_executor = self.__create_chain()

    def __load_retriever(self):
        """Load the FAISS retriever with OpenAI embeddings."""
        vectorDB = FAISS.load_local(
            self.__vectorDb,
            self.embeddings,
            allow_dangerous_deserialization=True,
        )
        return vectorDB.as_retriever(search_kwargs={"k" : 6})

    def __get_parser(self):
        """Get the JSON output parser configured for `RestaurantItems`."""
        return PydanticOutputParser(pydantic_object=RestaurantItems)

    def get_rules(self, input):
        if not os.path.exists(self.rulesDbPath):
            return ""
        rules_prompt = "\nFollow this rules: \n RULES: \n"
        rules_doc = FAISS.load_local(
            allow_dangerous_deserialization=True,
            embeddings=self.embeddings,
            folder_path=self.rulesDbPath,
        ).as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"score_threshold": 0.7}
        ).invoke(input)
        for rule_doc in rules_doc:
            rule = json.loads(rule_doc.page_content)
            rules_prompt += "- " + rule.get("rule") + "\n"
        return rules_prompt

    def __create_prompt(self, input):
        """Create a prompt template for querying."""
        input = input["query"]
        rules_prompt = self.get_rules(input)
        sys_message = self.prompt
        sys_message = sys_message + rules_prompt
        return PromptTemplate(
            template= sys_message,
            input_variables=["query"],
            partial_variables={
                "format_instructions": self.__output_parser.get_format_instructions()
            },
        )

    def __create_chain(self):
        """Create the processing chain for resturants searching."""
        return (
            {"context": self.__load_retriever(), "query": RunnablePassthrough()}
            | RunnableLambda(self.__create_prompt)
            | self.model
            | self.__output_parser
        )
