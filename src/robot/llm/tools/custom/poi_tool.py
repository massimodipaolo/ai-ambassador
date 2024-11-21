from typing import List, Union
from langchain_openai import ChatOpenAI
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_core.prompts.chat import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
)
from langchain.agents.agent import AgentExecutor
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from langchain_core.agents import AgentFinish, AgentAction
from langchain_community.vectorstores.faiss import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import RunnableLambda
import json
from ws_bom_robot_app.llm.models.api import LlmAppTool
from ws_bom_robot_app.llm.utils.print import printJson
from .db_functions import re_like
from datetime import datetime
from langsmith import Client
from uuid import uuid4
import os
import warnings
from sqlalchemy import exc as sa_exc

class PoiToolWrapper:

    def __init__(self, api_key: str, tool: LlmAppTool, n_items: int = 10):
        self.run_id = uuid4()
        self.client = None
        if "LANGCHAIN_API_KEY" in os.environ:
          self.client = Client()
        self.embeddings = OpenAIEmbeddings(api_key=api_key)
        self.rulesDbPath = tool.rules_vector_db or ""
        self.prompt = tool.llm_chain_settings.prompt or ""
        temperature = tool.llm_chain_settings.temperature or 0
        openai_model = tool.model or "gpt-4o"
        uri_db =  tool.db_settings.connection_string or ""
        self.n_items = n_items
        self.llm = ChatOpenAI(
            model=openai_model,
            temperature=temperature,
            streaming=False,
            api_key=api_key
        )
        with warnings.catch_warnings():
          warnings.simplefilter("ignore", category=sa_exc.SAWarning)
          self.db = SQLDatabase.from_uri(uri_db)
        self.agent_executor = self.__create_chain()

    def get_rules(self, input):
        if not os.path.exists(self.rulesDbPath):
            return ""
        rules_prompt = "\nFollow this rules: \n RULES: \n"
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=UserWarning)
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
        input = input["input"]
        rules_prompt = self.get_rules(input)
        sys_message = self.prompt.format(
            date_stamp=datetime.now().strftime("%d/%m/%Y")
        )
        sys_message = sys_message + rules_prompt
        prompt = ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(sys_message),
                HumanMessagePromptTemplate.from_template("{input}"),
            ],
            input_variables=["input"],
        )
        return prompt

    def __create_chain(self):
        """Create the chain of tools to execute."""
        return (
            {
                "input": lambda x: x["input"],
            }
            | RunnableLambda(self.__create_prompt)
            | self.llm
            | OpenAIToolsAgentOutputParser()
        ).with_config({"run_id": self.run_id})

    async def ask(self, query):
      with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=UserWarning)
        response: Union[List[AgentAction], AgentFinish] = await self.agent_executor.ainvoke({"input": query})
        response = json.loads(response.json())
        response_data = json.loads(response.get("return_values").get("output"))
        return self.__create_query(response_data)

    def __create_query(self, data):
        query_sql = """SELECT poi.id, \
poi.name, \
poi.description, \
CONCAT(poi.city, ", ", poi.address, ", ", poi.province) as place, \
CONCAT("https://pesaro2024.it/poi/?id=",poi.id) as url, \
poi.images \
FROM pesaro.pois as poi \
"""
        location = data.get("location", "")
        if not location:
            location = ""
        location_filter = ""
        filter_preffix = " WHERE "
        where_filters = []
        topic_filters = []
        tags_filters = []
        where_filters.append(" poi.published = 1 ")
        # LOCATION
        if location != "":
            location_filters = [
              re_like('poi.city', location),
              re_like('poi.province', location),
              re_like('poi.address', location)
            ]
            location_filter = " ( " + " OR ".join(location_filters) + " ) "
            where_filters.append(location_filter)
        # TOPIC
        if len(data.get("topic")) > 0:
            for topic in data.get("topic"):
                topic_likes = [
                    re_like('poi.name', topic),
                    re_like('poi.description', topic),
                    re_like('poi.tags', topic),
                    re_like('poi.category', topic),
                    re_like('poi.information', topic),
                    re_like('poi.subcategory', topic)
                ]
                topic_sql = " " + " OR ".join(topic_likes) + " "
                topic_filters.append(topic_sql)

            topic_filter = " (" + " OR ".join(topic_filters) + " ) "
            where_filters.append(topic_filter)
        # TAGS
        if len(data.get("tags")) > 0 and len(data.get("topic")) > 0:
            for tag in data.get("tags"):
                tag_likes = [
                    re_like('poi.tags', tag),
                    re_like('poi.category', tag),
                    re_like('poi.subcategory', tag)
                ]
                tag_sql = " " + " OR ".join(tag_likes) + " "
                tags_filters.append(tag_sql)
            # CATEGORY
            if len(data.get("category")) > 0:
                for category in data.get("category"):
                    category_likes = [
                        re_like('poi.category', category),
                        re_like('poi.subcategory', category)
                    ]
                    category_sql = " " + " OR ".join(category_likes) + " "
                    tags_filters.append(category_sql)
            tags_filters = " (" + " OR ".join(tags_filters) + " ) "
            where_filters.append(tags_filters)
        if len(where_filters) > 0:
            where_filter = filter_preffix + " AND ".join(where_filters)
            query_sql += where_filter
        query_sql += f" ORDER BY coalesce(poi.priority, 100) ASC, poi.name ASC LIMIT {self.n_items}"
        return self.__execute_query(query_sql)

    def __execute_query(self, query: str):
        if self.client:
          try:
            self.client.update_run(
                run_id=self.run_id,
                extra={"query": bytes(query, "utf-8").decode("unicode_escape")},
            )
          except:
            pass
        result = self.db.run(query)
        if result != "":
            result = eval(result)
            return self.__create_pois_result(result)
        return None

    def __create_pois_result(self, pois):
        response_pois = []
        for item in pois:
            image = None
            images = item[5]
            try:
                images = bytes(images, "utf-8").decode("unicode_escape")
                if images.startswith('"'):
                    images = images.lstrip('"').rstrip('"')
                images = json.loads(images)
                if images and len(images) > 0:
                    image = images[0]
            except:
                pass
            poi = {
                "id": item[0],
                "title": item[1],
                "abstract": item[2],
                "place": item[3],
                "url": item[4],
                "image": str(image).replace(" ", "%20") if image else "",
                "time": "",  # item[6]
            }
            if len(pois) > 1:
                poi["type"] = "poiItem"
            else:
                poi["type"] = "poi"
            printJson(poi)
            response_pois.append(poi)
        return json.dumps(response_pois)


