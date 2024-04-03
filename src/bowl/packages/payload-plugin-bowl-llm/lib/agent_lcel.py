from langchain.agents import AgentExecutor
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents.format_scratchpad.openai_tools import (
    format_to_openai_tool_messages,
)
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from datetime import datetime
from langchain_core.agents import AgentActionMessageLog, AgentFinish
import json

class AgentLcel:
        
    def __init__(self, apy_key: str, sys_message: str, tools: list):
        self.memory_key = "chat_history"
        self.__apy_key = apy_key
        self.__sys_message = sys_message.format(
            date_stamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        self.__llm = ChatOpenAI(
            api_key=self.__apy_key,
            model="gpt-4-0125-preview",
            streaming=True,
        )
        self.__tools = tools
        self.__llm_with_tools = self.__llm.bind_tools(self.__tools)
        self.executor = self.__create_agent()

    def __create_prompt(self):
        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    self.__sys_message,
                ),
                MessagesPlaceholder(variable_name=self.memory_key),
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

    def __create_agent(self):
        agent = (
            {
                "input": lambda x: x["input"],
                "agent_scratchpad": lambda x: format_to_openai_tool_messages(
                    x["intermediate_steps"]
                ),
                "chat_history": lambda x: x["chat_history"],
            }
            | self.__create_prompt()
            | self.__llm_with_tools
            | OpenAIToolsAgentOutputParser()
        )
        return AgentExecutor(agent=agent, tools=self.__tools, verbose=False)