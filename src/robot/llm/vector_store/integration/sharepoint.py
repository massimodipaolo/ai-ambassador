from ws_bom_robot_app.llm.vector_store.integration.base import IntegrationStrategy
from ws_bom_robot_app.llm.vector_store.loader.base import Loader
from langchain_core.documents import Document
import os, json, requests, shutil, logging

class Sharepoint(IntegrationStrategy):
    def __init__(self, knowledgebase_path: str, data: dict[str, str]):
        super().__init__(knowledgebase_path, data)
        self.__site_id = self.data.get("siteId")
        self.__drive_id = self.data.get("driveId")
        self.__folder_id = self.data.get("folderId")
        self.__client_id = self.data.get("clientId")
        self.__client_secret = self.data.get("clientSecret")
        self.__tenant_id = self.data.get("tenantId")
        self.__sharepoint_api = SharepointApi(self.working_directory, self.__client_id, self.__client_secret, self.__tenant_id, self.__site_id, self.__drive_id, self.__folder_id)
    def working_subdirectory(self) -> str:
        return "sharepoint"
    def load(self) -> list[Document]:
        loaders = Loader(self.working_directory)
        self.download_files(loaders.managed_file_extensions())
        self.download_pages()
        _docs = loaders.load()
        shutil.rmtree(self.working_directory)
        return _docs

    def download_files(self, filter_file_extensions:list[str]) -> bool:
      return self.__sharepoint_api.process_folder(self.__site_id, self.__drive_id, self.__folder_id, filter_file_extensions)

    def download_pages(self) -> bool:
      return self.__sharepoint_api.get_pages(self.__site_id)

class SharepointApi():
  def __init__(self, knowledgebase_path, client_id, client_secret, tenant_id, site_id, drive_id, folder_id=None):
      self.__knowledgebase_path = knowledgebase_path
      self.__client_id = client_id
      self.__client_secret = client_secret
      self.__tenant_id = tenant_id
      self.__token = self.get_access_token(self.__client_id, self.__client_secret, self.__tenant_id)

  def get_access_token(self, client_id, client_secret, tenant_id):
      url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
      data = {
          'grant_type': 'client_credentials',
          'client_id': client_id,
          'client_secret': client_secret,
          'scope': 'https://graph.microsoft.com/.default'
      }

      response = requests.post(url, data=data)

      if response.status_code == 200:
          return response.json().get('access_token')
      else:
          logging.warning(f"[{type(SharepointApi).__name__}]: auth error for tenant {tenant_id} {response.status_code}, {response.text}")
          return None

  def process_folder(self, site_id, drive_id, folder_id=None, filter_file_extensions:list[str]=None) -> bool:
      if self.__token is None:
          return []
      children = self.__get_children(site_id, drive_id, folder_id)
      for item in children:
          if 'folder' in item:  # È una cartella
              self.process_folder(site_id, drive_id, item['id'])
          elif 'file' in item:  # È un file
              if not self.__download_file(site_id, drive_id, item['id'],filter_file_extensions):
                  return False
      return True

  def __get_children(self, site_id, drive_id, item_id=None):
    headers = {
        'Authorization': f'Bearer {self.__token}'
    }

    if item_id is None:
        # Radice della document library
        url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root/children"
    else:
        # Elementi all'interno di una cartella
        url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{item_id}/children"

    all_items = []

    while url:  # Continua finché c'è una URL da seguire (per la paginazione)
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            json_data = response.json()
            all_items.extend(json_data.get('value', []))  # Aggiungo gli elementi recuperati
            url = json_data.get('@odata.nextLink')  # Recupero il nextLink se presente
        else:
            break

    return all_items

  def __download_file(self, site_id, drive_id, item_id, filter_file_extensions:list[str]=None) -> bool :
      headers = {
          'Authorization': f'Bearer {self.__token}'
      }

      # Ottenere i metadati del file per estrarre il nome
      url_metadata = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/items/{item_id}"
      response_metadata = requests.get(url_metadata, headers=headers)

      if response_metadata.status_code == 200:
          # Ottieni il nome del file dai metadati
          file_name = response_metadata.json().get('name', 'default_name')
          #check valid file extension
          if filter_file_extensions and not any([file_name.endswith(ext) for ext in filter_file_extensions]):
              return True
          # URL per scaricare il contenuto del file
          url_content = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/items/{item_id}/content"
          response_content = requests.get(url_content, headers=headers)

          if response_content.status_code == 200:
              # creo il file temporaneo
              try:
                with open(os.path.join(self.__knowledgebase_path,file_name), "wb") as f:
                    f.write(response_content.content)
              except Exception as e:
                raise e
              return True
          else:
              return False
      else:
          return False

  def get_pages(self, site_id) -> bool:
      if self.__token is None:
          return []
      headers = {
          'Authorization': f'Bearer {self.__token}'
      }
      url_metadata = f"https://graph.microsoft.com/v1.0/sites/{site_id}/pages"
      request = requests.get(url_metadata, headers=headers)
      if request.status_code == 200:
          sites = json.loads(request.content)
          for site in sites["value"]:
              page_url = site['webUrl']
              if not self.__download_page_contents(site_id, site['id'], page_url):
                  return False
          return True
      else:
          logging.warning(f"[{type(SharepointApi).__name__}]: find page {site_id} error {request.status_code}: {request.text}")
          return False

  def __download_page_contents(self, site_id, page_id, page_url) -> bool:
      headers = {
          'Authorization': f'Bearer {self.__token}'
      }
      url_metadata = f"https://graph.microsoft.com/v1.0/sites/{site_id}/pages/{page_id}/microsoft.graph.sitepage/webparts"
      request = requests.get(url_metadata, headers=headers)
      if request.status_code == 200:
          html_items = []
          site_content: dict = json.loads(request.content)
          for item in site_content.get("value", []):
              html_items.append(f"{item.get('innerHtml', '')}")
          if len(html_items) > 0 :
              _content = '\n\n'.join(html_items)
              if _content.strip() != "":
                with open(os.path.join(self.__knowledgebase_path, f"{page_id}.html"), "w", encoding="utf-8") as f:
                    f.write(_content)
          return True
      else:
          logging.warning(f"[{type(SharepointApi).__name__}]: find content page {site_id}/{page_id} error {request.status_code}: {request.text}")
          return False


