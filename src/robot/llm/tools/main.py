from typing import  List, Optional, Type, Union
from ws_bom_robot_app.llm.models.api import LlmAppTool
from .custom.trip_advisor_tool import RestaurantToolWrapper, RestaurantItems
from .custom.event_tool import EventToolWrapper
from .custom.poi_tool import PoiToolWrapper
from .custom.video_tool_sf import video_tool_function
from .custom.models_input import *
from ws_bom_robot_app.llm.utils.faiss_helper import FaissHelper
from langchain_core.documents import Document
from ws_bom_robot_app.llm.tools.utils import getRandomWaitingMessage, translate_text
from ws_bom_robot_app.llm.utils.print import printJson
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from ws_bom_robot_app.llm.tools.tool_manager import ToolManager,ToolConfig

def init():
  ToolManager._list["knowledge-events-experiences"] = ToolConfig(function=search_events, model=EventInput)
  ToolManager._list["knowledge-points-of-interest"] = ToolConfig(function=search_points_of_interest, model=PoiInput)
  ToolManager._list["knowledge-restaurants-locals"] = ToolConfig(function=search_restaurant_locals, model=RestaurantsInput)
  ToolManager._list["lfo_cards"] = ToolConfig(function=lfo_card_retriever, model=LfoCardInput)
  ToolManager._list["email_sender"] = ToolConfig(function=email_sender, model=EmailSenderInput)
  ToolManager._list["silicon_catalog_search"] = ToolConfig(function=silicon_catalog_search, model=CatalogCardInput)
  ToolManager._list["video_tool_sf"] = ToolConfig(function=video_tool_sf)

#region functions
async def email_sender(self, answer_to_questions: List[QAItem], analisys: str, to_email:str):
  secrets = self.app_tool.get("secrets", {})
  secrets = {item["secretId"]: item["secretValue"] for item in secrets}
  # Email configuration
  smtp_server = secrets.get("smtp_server")
  smtp_port = secrets.get("smtp_port")
  smtp_user = secrets.get("smtp_user")
  smtp_password = secrets.get("smtp_password")
  from_email = secrets.get("from_email")
  if not to_email or to_email == "":
    to_email = secrets.get("to_email")

  # Create the email content
  msg = MIMEMultipart()
  msg['From'] = from_email
  msg['To'] = to_email
  msg['Subject'] = "TEST Risultato questionario"

  # Create the email body
  body = "\n\n".join([f"TEST Risultati:\nQ: {item.question}\nA: {item.answer}" for item in answer_to_questions] + [f"Analisi questionario: {analisys}"])
  msg.attach(MIMEText(body, 'plain'))

  # Send the email
  try:
    with smtplib.SMTP(smtp_server, smtp_port) as server:
      server.starttls()
      server.login(smtp_user, smtp_password)
      server.send_message(msg)
  except Exception as e:
    return f"Failed to send email: {str(e)}"
  return "Email sent successfully"

async def silicon_catalog_search(self, query: str, price_min: float = None, price_max: float = None, qty_min: int = None, qty_max: int = None): # type: ignore
  products: Union[List[Document], Exception] = await self.document_retriever(query)
  if isinstance(products, Exception):
    return "Sorry, couldn't find any products matching the query"
  product_cards = []
  label_allowed = ["Novità", "Outlet", "Bestseller", "Save the planet"]
  secrets = self.app_tool.secrets or []
  secrets = {item["secretId"]: item["secretValue"] for item in secrets}
  not_available_text = secrets.get("not_available_text", None)
  for product in products:
    product_data: dict = json.loads(product.page_content)
    transformed_data = {
      "type": "productItem",  # Assuming it's a product item
      "productType": "simple",  # Assuming it's a simple product
      "id": product_data.get("sku", None),  # Using SKU as id
      "title": product_data.get("name", None),  # Map name to title
      "abstract": product_data.get("description", None),  # Map description to abstract
      "sku": product_data.get("sku", None),
      "currency": "EUR",
      "price": product_data.get("price", None),
      "availability": product_data.get("qty", None),  # Map qty to availability
      "media": {
        "type": "image",
        "src": product_data.get("thumbnail", None)
      },  # Map thumbnail to media
      "url": product_data.get("url"),
      "label": next((category for category in product_data.get("categories", []) if category in label_allowed), "")
    }

    if not price_min and not price_max and not qty_min and not qty_max:
        product_cards.append(transformed_data)
    else:
        # 1. Se tutti i parametri (price_min, price_max, qty_min, qty_max) sono definiti
        if price_min is not None and price_max is not None and qty_min is not None and qty_max is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if price_min <= product_data.get("price") <= price_max and qty_min <= product_data.get("qty") <= qty_max: #type: ignore
                    product_cards.append(transformed_data)
        # 2. Se solo price_min e price_max sono definiti
        elif price_min is not None and price_max is not None and qty_min is None and qty_max is None:
            if product_data.get("price") is not None:
                if price_min <= product_data.get("price") <= price_max:
                    product_cards.append(transformed_data)
        # 3. Se solo qty_min e qty_max sono definiti
        elif qty_min is not None and qty_max is not None and price_min is None and price_max is None:
            if product_data.get("qty") is not None:
                if qty_min <= product_data.get("qty") <= qty_max:
                    product_cards.append(transformed_data)
        # 4. Se qty_min, qty_max definiti e price_min definito
        elif qty_min is not None and qty_max is not None and price_min is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if price_min <= product_data.get("price") and qty_min <= product_data.get("qty") <= qty_max:
                    product_cards.append(transformed_data)
        # 5. Se qty_min, qty_max definiti e price_max definito
        elif qty_min is not None and qty_max is not None and price_max is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if product_data.get("price") <= price_max and qty_min <= product_data.get("qty") <= qty_max:
                    product_cards.append(transformed_data)
        # 6. Se qty_min e price_min definiti
        elif qty_min is not None and price_min is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if price_min <= product_data.get("price") and qty_min <= product_data.get("qty"):
                    product_cards.append(transformed_data)
        # 7. Se qty_min e price_max definiti
        elif qty_min is not None and price_max is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if product_data.get("price") <= price_max and qty_min <= product_data.get("qty"):
                    product_cards.append(transformed_data)
        # 8. Se qty_max e price_min definiti
        elif qty_max is not None and price_min is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if price_min <= product_data.get("price") and product_data.get("qty") <= qty_max:
                    product_cards.append(transformed_data)
        # 9. Se qty_max e price_max definiti
        elif qty_max is not None and price_max is not None:
            if product_data.get("price") is not None and product_data.get("qty") is not None:
                if product_data.get("price") <= price_max and product_data.get("qty") <= qty_max:
                    product_cards.append(transformed_data)
        # 10. Se è definito solo price_min
        elif price_min is not None:
            if product_data.get("price") is not None:
                if price_min <= product_data.get("price"):
                    product_cards.append(transformed_data)
        # 11. Se è definito solo price_max
        elif price_max is not None:
            if product_data.get("price") is not None:
                if product_data.get("price") <= price_max:
                    product_cards.append(transformed_data)
        # 12. Se è definito solo qty_min
        elif qty_min is not None:
            if product_data.get("qty") is not None:
                if qty_min <= product_data.get("qty"):
                    product_cards.append(transformed_data)
        # 13. Se è definito solo qty_max
        elif qty_max is not None:
            if product_data.get("qty") is not None:
                if product_data.get("qty") <= qty_max:
                    product_cards.append(transformed_data)

  product_cards = product_cards[:int(secrets.get("products_to_display", 32))]
  if secrets.get("is_sorted", None) == "availability":
    product_cards.sort(key=lambda x: (x['availability'], x['price']), reverse=True)
  elif secrets.get("is_sorted", None) == "price":
    product_cards.sort(key=lambda x: (x['price'], x['availability']), reverse=True)

  for product in product_cards:
    product["availability"] = not_available_text if product.get("availability", None) == 0 else  product["availability"]
    if secrets.get("show_price", None) == "false":
      product.pop("price", None)
      product.pop("currency", None)
    if secrets.get("show_qty", None) == "false":
      product.pop("availability",None)
    if secrets.get("show_abstract", None) == "false":
      product.pop("abstract",None)
    printJson(product)
  return "True"

async def lfo_card_retriever(self, query: str, n_items: int = 5):
    if (
        self.app_tool.type == "function"
        and self.app_tool.data_source == "knowledgebase"
    ):
        json_cards = []
        results = await FaissHelper.invoke(self.app_tool.vector_db, self.api_key, query, "similarity",search_kwargs={"k": n_items}) # type: ignore
        for result in results:
            json_cards.append(json.loads(result.page_content))
        return json_cards
    return Exception(
        f"Invalid configuration for {self.app_tool.name} tool. Muste be a function and dataSource must be knowledgebase."
    )

async def search_events(
    self, query: str, n_items: int = 10, language: str = "it"
) -> str:
    random_waiting_message =  getRandomWaitingMessage(self.app_tool.waiting_message)
    if not language:
        language = "it"
    await translate_text(
        self.api_key, language, random_waiting_message, self.callbacks
    )
    event_agent = EventToolWrapper(self.api_key, self.app_tool, n_items)
    response = await event_agent.ask(query)
    if response:
        return response
    return "Sorry, couldn't find anything relevant to the request"

async def search_points_of_interest(
    self, query: str, n_items: int = 10, language: str = "it"
) -> str:
    random_waiting_message = getRandomWaitingMessage(self.app_tool.waiting_message, traduction=False)
    if not language:
        language = "it"
    await translate_text(
        self.api_key, language, random_waiting_message, self.callbacks
    )
    poi_agent = PoiToolWrapper(self.api_key, self.app_tool, n_items)
    response = await poi_agent.ask(query)
    if response:
        return response
    return "Sorry, couldn't find anything relevant to the request"

async def search_restaurant_locals(self, query: str, language: str = "it") -> str:
    random_waiting_message = getRandomWaitingMessage(self.app_tool.waiting_message, traduction=False)
    if not language:
        language = "it"
    await translate_text(
        self.api_key, language, random_waiting_message, self.callbacks
    )
    if (
        self.app_tool.type == "llmChain"
        and self.app_tool.data_source == "knowledgebase"
    ):
        chain = RestaurantToolWrapper(self.api_key, self.app_tool)
        response: RestaurantItems = chain.tool_executor.invoke(query)
        for item in response.items:
            item_json = item.json()
            item_data = json.loads(item_json.encode("utf-8"))
            if len(response.items) > 1:
                item_data["type"] = "tripadvisorItem"
            else:
                item_data["type"] = "tripadvisor"
            printJson(item_data)
        return "Introduction to the content of the answer in the best way you can ALWAYS WITHOUT the information context retrived. DO NOT answer WITH THE INFORMATION RETRIEVED"  # response.json()
    else:
        raise Exception(
            f"Invalid configuration for '{self.app_tool.name}' tool. Muste be a llmChain and dataSource must be knowledgebase."
        )

async def video_tool_sf(self, query: str) -> str:
    url_ouput = video_tool_function(self.api_key, query, self.app_tool)
    return url_ouput
# endregion
