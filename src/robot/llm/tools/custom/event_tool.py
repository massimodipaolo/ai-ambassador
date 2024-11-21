from langchain_openai import ChatOpenAI
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_core.prompts.chat import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
)
from langchain.agents.agent import AgentExecutor
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from langchain_core.agents import AgentFinish
from langchain_community.vectorstores.faiss import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import RunnableLambda
import json
from ws_bom_robot_app.llm.models.api import LlmAppTool
from ws_bom_robot_app.llm.utils.print import printJson
from .db_functions import re_like, re_like_coalesce
from datetime import datetime
from langsmith import Client
from uuid import uuid4
import os
import warnings
from sqlalchemy import exc as sa_exc

class EventToolWrapper:

    def __init__(self, api_key: str, tool: LlmAppTool, n_items: int = 10):
        self.DELTA_PERIOD = 10
        self.run_id = uuid4()
        self.client = None
        if "LANGCHAIN_API_KEY" in os.environ:
          self.client = Client()
        self.embeddings = OpenAIEmbeddings(api_key=api_key) # type: ignore
        self.rulesDbPath = tool.rules_vector_db or ""
        openai_model = tool.llm_chain_settings.model or "gpt-4o"
        temperature = tool.llm_chain_settings.temperature or 0
        uri_db =  tool.db_settings.connection_string
        self.n_items = n_items
        self.llm = ChatOpenAI(
            model=openai_model,
            temperature=temperature,
            streaming=False,
            api_key=api_key # type: ignore
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
            date_stamp=datetime.now().strftime("%Y/%m/%d")
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

    def __create_chain(self) -> AgentExecutor:
        """Create the chain of tools to execute."""
        return (
            {
                "input": lambda x: x["input"],
            }
            | RunnableLambda(self.__create_prompt)
            | self.llm
            | OpenAIToolsAgentOutputParser()
        ).with_config({"run_id": self.run_id}) # type: ignore

    async def ask(self, query):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=UserWarning)
            response: AgentFinish = await self.agent_executor.ainvoke({"input": query}) # type: ignore
            response = json.loads(response.json())
            response_data = json.loads(response.get("return_values").get("output")) # type: ignore
            return self.__create_query(response_data)

    def __create_query(self, data):
        query_sql = """SELECT ex.id, \
ex.title, \
ex.description, \
CONCAT(coalesce( CONCAT(ex.city, \",\"), CONCAT(p.city , \", \"), \"\" ),coalesce( CONCAT(ex.address, \",\"), CONCAT(p.address , \", \"), \"\" ), coalesce( CONCAT(ex.province, \"\"), CONCAT(p.province , \"\"), \"\" )) as place, \
CONCAT(\"https://pesaro2024.it/experience-event/?id=\",ex.id) as url, \
ex.images, \
CONCAT(DATE_FORMAT(ex_p.start_date, \"%d/%m/%Y\"), \" - \" , DATE_FORMAT(ex_p.end_date, \"%d/%m/%Y\")) as date \
FROM pesaro.experiences as ex \
LEFT JOIN pesaro.experience_periods as ex_p ON ex.id = ex_p.experience_id \
LEFT JOIN pesaro.pois as p ON ex.poi_id = p.id \
"""
        location = data.get("location", None)
        location_filter = ""
        filter_preffix = " WHERE "
        where_filters = []
        topic_filters = []
        tags_filters = []
        where_filters.append(" ex.published = 1 ")
        # LOCATION
        if location or not location == "":
            location_filters = [
              re_like('ex.city', location),
              re_like('p.city', location),
              re_like('ex.province', location),
              re_like('p.province', location),
              re_like('ex.address', location),
              re_like('p.address', location),
              re_like('p.name', location),
              re_like_coalesce('ex.city', location, 'Pesaro'),
            ]
            location_filter = " ( " + " OR ".join(location_filters) + " ) "
            where_filters.append(location_filter)
        # PERIOD
        for date in data.get("period"):
            start_date = datetime.strptime(date.get("start_date"), "%Y-%m-%d").strftime(
                "%Y-%m-%d"
            )
            if date.get("end_date") and (
                data.get("end_date") != date.get("start_date")
            ):
                end_date = datetime.strptime(date.get("end_date"), "%Y-%m-%d").strftime(
                    "%Y-%m-%d"
                )
                period_sql = f" ( (ex_p.start_date <= \"{end_date}\" AND ex_p.end_date >= \"{start_date}\" ) "
            else:
                period_sql = f" ( (ex_p.end_date >= \"{start_date}\" ) "
            where_filters.append(period_sql)
            where_filters.append(f" (ex_p.end_date >= \"{datetime.now().strftime('%Y-%m-%d')}\") )" )
        if len(data.get("topic")) > 0 or len(data.get("tags")) > 0:
            # TOPIC
            if len(data.get("topic")) > 0:
              for topic in data.get("topic"):
                  topic_likes = [
                    re_like('ex.title', topic),
                    re_like('ex.description', topic),
                    re_like('ex.tags', topic),
                    re_like('ex.target', topic),
                    re_like('ex.whats_included', topic)
                  ]
                  topic_sql = " " + " OR ".join(topic_likes) + " "
                  topic_filters.append(topic_sql)
            # TAGS
            if len(data.get("tags")) > 0 and len(data.get("topic")) != 1:
                for tag in data.get("tags"):
                    tag_sql = f" {re_like('ex.tags', tag)} "
                    tags_filters.append(tag_sql)

            topic_filter = " ( "
            if len(topic_filters) > 0:
              topic_filter += " " + " OR ".join(topic_filters) + " "
              if len(tags_filters) > 0:
                topic_filter += " OR "
            if len(tags_filters) > 0:
              topic_filter += " " + " OR ".join(tags_filters) + " "
            topic_filter += " ) "

            where_filters.append(topic_filter)

        where_filter = ""
        if len(where_filters) > 0:
          where_filter = filter_preffix + " AND ".join(where_filters)

        if where_filter != "":
          query_sql += where_filter

        order_by = " ORDER BY ex_p.end_date ASC, ex.priority DESC "
        query_sql += order_by + f" LIMIT {self.n_items}"
        return self.__execute_query(query_sql)

    def __execute_query(self, query: str):
        if self.client:
          try:
            self.client.update_run(
                run_id=self.run_id,
                extra={"query": bytes(query, "utf-8").decode("unicode_escape")}, #.replace('"', "'")
            )
          except:
            pass
        result = self.db.run(query)
        if result != "":
            result = eval(result) # type: ignore
            return self.__create_events_result(result)
        return None

    def __create_events_result(self, events):
        response_events = []
        for item in events:
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
            event = {
                "id": item[0],
                "title": item[1],
                "abstract": item[2],
                "place": item[3],
                "url": item[4],
                "image": str(image).replace(" ", "%20") if image else "",
                "date": item[6],
                "time": "",  # item[7],
            }
            if len(events) > 1:
                event["type"] = "eventItem"
            else:
                event["type"] = "event"
            printJson(event)
            response_events.append(event)
        return json.dumps(response_events)
