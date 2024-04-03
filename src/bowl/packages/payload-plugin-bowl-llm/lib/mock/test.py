from openai import AsyncOpenAI
from openai import OpenAI
from utils.print import printJson, printString
import asyncio;
import io;
import json;
import random;
import sys;
import time;

async def main() -> None:

  data = json.loads(sys.argv[1])

  secrets = data["secrets"]
  api_key = secrets["openAIApiKey"]
  messages = data["messages"]
  threadId = data["threadId"]

  firstChunk = {
    "type": "info",
    "version": "1.0.0",
    "python": "python " + str(sys.version_info.major) + "." + str(sys.version_info.minor),
    "threadId": threadId,
  }
  printJson(firstChunk)
  # sys.stdout.flush()

  lorem = "Etiam sollicitudin consectetur maximus. Integer sodales, massa città ac ultrices facilisis, eros arcu rhoncus mauris, at porta urna sapien et lectus. Integer id nisi ligula verità. Donec elementum vestibulum turpis, vitae hendrerit mauris mattis et. Donec mollis, lacus id luctus dignissim, metus dolor blandit diam, sed pellentesque lacus felis eget enim. Suspendisse ut purus ante. Vivamus in pulvinar lectus. Maecenas id magna bibendum, tempor lorem ut, iaculis quam."

  items = lorem.split(" ")

  lastChunk = {
    "type": "end",
    "created": 1700207332,
    "id": "chatcmpl-8LnsqsNMf98f3kDIKeAsB15UEWocj",
    "model": "gpt-3.5-turbo-0613",
    "object": "chat.completion.chunk",
    "system_fingerprint": "fp_44709d6fcb"
  }

  for part in items:
      content = part or ""
      isEndOfLine = "." in content
      if isEndOfLine:
        content = content + "\r\n"
      else:
        content = content + " "
      printJson(content)
      # sys.stdout.flush()
      time.sleep(0.1)
      random_number = random.randint(1, 3)
      if isEndOfLine and random_number == 1:
        chunk = {
          "type": "image",
          "src": "https://placehold.jp/150x150.png",
        }
        printJson(chunk)
        # sys.stdout.flush()
        time.sleep(0.1)

  printJson(lastChunk)
  # sys.stdout.flush()

asyncio.run(main())
