from langchain_core.agents import AgentFinish
from langchain_core.outputs import ChatGenerationChunk, GenerationChunk
from langchain.callbacks.base import AsyncCallbackHandler
from utils.print import printJson, printString
from typing import Any, Dict, List, Optional, Union
from uuid import UUID
import json
from langchain_core.callbacks.base import AsyncCallbackHandler
from langchain_core.outputs import ChatGenerationChunk, GenerationChunk

# Here is a custom handler that will print the tokens to stdout.
# Instead of printing to stdout you can send the data elsewhere; e.g., to a streaming API response


class AgentHandler(AsyncCallbackHandler):

    def __init__(self, threadId) -> None:
        super().__init__()
        self._threadId = threadId

    async def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: UUID,
        parent_run_id: UUID = None,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
        **kwargs: Any,
    ) -> None:
        firstChunk = {
            "type": "info",
            "threadId": self._threadId,
        }
        printJson(firstChunk)

    async def on_tool_end(self, output: str, *, run_id: UUID, parent_run_id: UUID = None, tags: List[str] = None, **kwargs: Any) -> None:
        items = []
        data_items = [item.strip() + '}' for item in output.strip().split('}') if item]
        for item in data_items:
            try:
                items.append(json.loads(item))
            except:
                pass
        for item in items:
            printJson(item)
        

    async def on_llm_new_token(
        self,
        token: str,
        *,
        chunk: Optional[Union[GenerationChunk, ChatGenerationChunk]] = None,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> None:
        """Run on new LLM token. Only available when streaming is enabled."""
        if token != "":
            printString(token)

    async def on_agent_finish(
        self,
        finish: AgentFinish,
        *,
        run_id: UUID,
        parent_run_id: UUID = None,
        tags: List[str] = None,
        **kwargs: Any,
    ) -> None:
        finalChunk = {"type": "end"}
        printJson(finalChunk)
