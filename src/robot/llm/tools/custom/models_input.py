from typing import List
from pydantic import BaseModel, Field

class EventInput(BaseModel):
  query: str = Field(
      description="semantic query for events. Should be one the exactly semantic query write by the user."
  )
  #n_items: int = Field(description="Number of events to return. Default is 10.", default=10)
  language: str = Field(description="Language of the query. Default is 'it'", default="it")

class PoiInput(BaseModel):
  query: str = Field(
      description="semantic query for poi.  Should be one the exactly semantic query write by the user."
  )
  #n_items: int = Field(description="Number of poi to return. Default is 10.", default=10)
  language: str = Field(description="Language of the query. Default is 'it'", default="it")

class RestaurantsInput(BaseModel):
  query: str = Field(
      description="search query for retaurants. Should be one or more keyword reparated by comma."
  )
  language: str = Field(description="Language of the query.Default is 'it' ", default="it")

class LfoCardInput(BaseModel):
  query: str = Field(
      description="search query for similarity search."
  )
  #n_items: int = Field(description="Number of cards to return.", default=4)

class QAItem(BaseModel):
    question: str
    answer: str

class EmailSenderInput(BaseModel):
    answer_to_questions: List[QAItem]
    analisys: str
    to_email: str

class CatalogCardInput(BaseModel):
  query: str = Field(
      description="search query for similarity search."
  )
  price_min: float = Field(description="minimum price of the product.", default=None)
  price_max: float = Field(description="maximum price of the product.", default=None)
  qty_min: int = Field(description="maximum quantity of the product.", default=None)
  qty_max: int = Field(description="maximum quantity of the product.", default=None)
