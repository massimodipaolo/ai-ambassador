import requests, re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.chains.llm import LLMChain
from ws_bom_robot_app.llm.models.api import LlmAppToolChainSettings, LlmAppTool
from ws_bom_robot_app.llm.utils.print import printString

def getSecret(tool_settings: LlmAppTool):
    for secret in tool_settings.secrets:
        if secret.get("secretId") == "video_tool_sf_endpoint":
            return secret.get("secretValue")
    return None

def getVideoList(video_endpoint):
    url: str = video_endpoint or ""
    try:
      response = requests.get(url)
      #open("videoList.json", "wb").write(response.content)
      return response.json()  # assuming the response is in JSON format
    except:
      printString("Richiesta all'endopint video fallita.")

def getSubtitiles(url: str):
    response = requests.get(url)
    return response  # assuming the response is in JSON format


def convert_to_seconds(time_str):
    try:
        # Extract the time part from time_str
        match = re.search(r"\d+:\d+:\d+", time_str)
        if match:
            time_str = match.group()
        h, m, s = map(str, time_str.split(":"))
        return str(round(3600 * int(h) + 60 * int(m) + float(s)))
    except Exception:
        return "0"


def find_time_using_chain(vcc_text, query, chain_settings: LlmAppToolChainSettings, api_key, openai_model):
    system_msg = chain_settings.prompt
    temperature = chain_settings.temperature
    llm = ChatOpenAI(
        api_key=api_key,
        temperature=temperature,
        model=openai_model
    )
    prompt = PromptTemplate(
        input_variables=["query", "context"],
        template=system_msg,
    )
    chain = LLMChain(llm=llm, prompt=prompt)
    response = chain.invoke({"query": query, "context": vcc_text})
    return response["text"].replace("\n", "")


def video_tool_function(api_key:str, phrase: str, tool_settings: LlmAppTool):
    video_enpoint = getSecret(tool_settings)
    data = getVideoList(video_enpoint)
    openai_model = tool_settings.model or "gpt-4-turbo"
    all_videos = []
    for chapter in data["chapters"]:
        for video in chapter["videos"]:
            video_info = {
                "title": video["title"],
                "id": video["id"],
                "thumbnail": video["thumbnail"],
                "subtitles": video["subtitles"],
            }
            all_videos.append(video_info)

    titles = [video["title"] for video in all_videos]
    titles.append(phrase)

    vectorizer = TfidfVectorizer().fit_transform(titles)
    vectors = vectorizer.toarray()  # type: ignore

    csim = cosine_similarity(vectors[:-1], vectors[-1:])
    similar_index = csim.argmax()
    most_similar_title = titles[similar_index]

    id = ""
    subtitile = ""
    thumbnail_url = ""

    # Find the video with the most similar title
    for video in all_videos:
        if video["title"] == most_similar_title:
            id = video["id"]
            subtitile = video["subtitles"]
            thumbnail_url = video["thumbnail"]
            break
    # Download the file from the subtitle_url
    response = requests.get(subtitile)
    # Save the content of the response into a variable
    subtitle_file_content = response.content
    # Get system Message from tool_settings
    chain_settings = tool_settings.llm_chain_settings
    # Find the time of the phrase in the subtitle
    time = find_time_using_chain(subtitle_file_content, phrase, chain_settings, api_key, openai_model)
    return (
        f"![VIDEO]({thumbnail_url}?id={id}&t={str(convert_to_seconds(str(time)))})"
    )
    #f"Ecco il video richesto, spero ti sia utile!\n"
      #+
