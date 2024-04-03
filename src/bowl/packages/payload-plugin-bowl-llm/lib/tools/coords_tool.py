import re
from typing import List
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.runnables import RunnablePassthrough
from langchain_core.pydantic_v1 import BaseModel, Field, validator
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate


class CoordsInput(BaseModel):
    coordinate_1: str = Field(
        description="should be coordinates in the format 'lat, long'"
    )
    coordinate_2: str = Field(
        description="should be coordinates in the format 'lat, long'"
    )


class CoordsToolWrapper:
    def __init__(self, apy_key: str, vectorDb: str):
        self.__apy_key = apy_key
        self.__vectorDb = vectorDb
        self.tool_executor = self.__create_chain()

    def __load_retriever(self):
        """Load the FAISS retriever with OpenAI embeddings."""
        vectorDB = FAISS.load_local(
            self.__vectorDb, OpenAIEmbeddings(api_key=self.__apy_key)
        )
        return vectorDB.as_retriever(search_kwargs={"k": 1})

    def __create_prompt(self):
        """Create a prompt template for querying."""
        return PromptTemplate(
            template="""You are an agent who specializes in finding the places that are the most gographically close together given 2 corrdinates of latitude and longitude.\
                You have been asked to find the places that are the most geographically close together using this formula: distance= 2*r*arcsin(sqrt((sin^2)*(Δϕ/2) + cos(ϕ1)*cos(ϕ2)*(sin^2)*(Δλ/2)))\
                with:\
                - dinstance è la distanza tra i due punti lungo la superficie della sfera,\
                - r è il raggio medio della Terra (circa 6,371 km),\
                - ϕ1 e ϕ2 sono le latitudini dei due punti in radianti,\
                - Δϕ è la differenza tra le latitudini dei due punti,\
                - Δλ è la differenza tra le longitudini dei due punti,\
                λ1 e λ2 sono le longitudini dei due punti in radianti.\
                \n{context}\n\
                Coordinate 1: {Cordinates_1}, Coordinates 2 {Cordinates_2}\n""",
            input_variables=["query"],
        )

    def find_nearest_coords(self,query, latitude, longitude):
        min_distance = float('inf')
        nearest_poi = None
        query_doc = self.__load_retriever().invoke(query)
        query_coords = query_doc[0].dict()
        """for poi in self.poi_list:
            distance = self.calculate_distance(latitude, longitude, poi.latitude, poi.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_poi = poi

        return nearest_poi"""

    def __create_chain(self):
        """Create the processing chain for coords searching."""
        model = ChatOpenAI(
            api_key=self.__apy_key,
            model="gpt-4-0125-preview",  # "gpt-3.5-turbo-0125"
        )
        return (
            {
                "context": self.__load_retriever(),
                "Cordinates_1": RunnablePassthrough(),
                "Cordinates_2": RunnablePassthrough(),
            }
            | self.__create_prompt()
            | model
        )

    def __calculate_distance(self, lat1, lon1, lat2, lon2):
        # Formula di Haversine per calcolare la distanza tra due coordinate geografiche
        R = 6371.0  # Raggio della Terra in chilometri

        lat1_rad = radians(lat1)
        lon1_rad = radians(lon1)
        lat2_rad = radians(lat2)
        lon2_rad = radians(lon2)

        dlon = lon2_rad - lon1_rad
        dlat = lat2_rad - lat1_rad

        a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        distance = R * c

        return distance
