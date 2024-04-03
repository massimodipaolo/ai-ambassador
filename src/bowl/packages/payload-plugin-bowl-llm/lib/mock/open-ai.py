# import io;
# import time;
#from openai import OpenAI
from openai import AsyncOpenAI
from utils.print import printJson, printString
import asyncio;
import json;
import sys;

async def main() -> None:

  data = json.loads(sys.argv[1])

  secrets = data["secrets"]
  api_key = secrets["openAIApiKey"]
  messages = data["messages"]
  threadId = data["threadId"]

  # defaults to os.environ.get("OPENAI_API_KEY")
  client = AsyncOpenAI(
    api_key=api_key
  )

  stream = await client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=messages,
    stream=True,
  )

  firstChunk = {
    "type": "info",
    "version": "1.0.0",
    "python": "python " + str(sys.version_info.major) + "." + str(sys.version_info.minor),
    "threadId": threadId,
  }
  printJson(firstChunk)
  # sys.stdout.flush()

  lastChunk = {
    "type": "end",
    "id": "",
    "object": "",
    "created": 0,
    "model": "",
    "system_fingerprint": "",
  }

  async for part in stream:
      lastChunk.update({
        "id": part.id,
        "object": part.object,
        "created": part.created,
        "model": part.model,
        "system_fingerprint": part.system_fingerprint
      })
      content = part.choices[0].delta.content or ""
      printJson(content)
      # sys.stdout.flush()
      # time.sleep(0.1)

  printJson(lastChunk)
  # sys.stdout.flush()
  sys.stdout.flush()

asyncio.run(main())
