from langchain_core.documents import Document
import scrapy
from scrapy.crawler import CrawlerProcess
from w3lib.html import remove_tags
from langchain_core.documents import Document

def getPageDocuments(urls: list) -> list[Document]:

  contents: list[Document] = []

  class MySpider(scrapy.Spider):
      name = "web_spider"
      tags_to_remove = [
          'script', 'style', 'link', 'header', 'footer', 'nav', 'aside', 'form', 'iframe', 'noscript'
      ]

      def __init__(self, urls, *args, **kwargs):
          super().__init__(*args, **kwargs)
          self.start_urls = urls

      def parse(self, response):
          try:
                #get the page content
                page_html = response.xpath("//body").get()

                cleaned_text = remove_tags(page_html, keep=('img', 'a'))

                for tag in self.tags_to_remove:
                    page_text = [remove_tags(text, which_ones=(tag,)) for text in cleaned_text]

                ## Pulisci il testo rimuovendo spazi extra
                cleaned_text = ' '.join(cleaned_text.split())

                # Aggiungi il documento alla lista
                contents.append(Document(page_content=cleaned_text, metadata={"source": response.url}))

          except Exception:
              pass

  def scrape(urls):
      process = CrawlerProcess(settings={
          'LOG_LEVEL': 'ERROR',
      })

      process.crawl(MySpider, urls=urls)
      process.start()


  scrape(urls)
  return contents
