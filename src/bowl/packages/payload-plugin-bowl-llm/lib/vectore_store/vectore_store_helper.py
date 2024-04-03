import sys
import json
import os
import shutil
from datetime import datetime
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.document_loaders.merge import MergedDataLoader
from langchain_community.vectorstores.faiss import FAISS
from my_loader import MyLoader
from langchain_community.document_loaders import PyPDFLoader 
from langchain_community.document_loaders import Docx2txtLoader

#with open("./vector_temp.json", "w+") as f:
#        f.write(sys.argv[1])
# input_data = json.loads(open("./vector_temp.json", "r").read())
input_data = json.loads(sys.argv[1])
secrets = input_data["secrets"]
knowledgebase_path = input_data["knowledgeBasePath"]
api_key = secrets["openAIApiKey"]

# Rename files without extension to .json
for filename in os.listdir(knowledgebase_path):
    if os.path.join(knowledgebase_path, filename):
        if os.path.splitext(filename)[1] == "":
            new_filename = filename + ".json"
            os.rename(
                os.path.join(knowledgebase_path, filename),
                os.path.join(knowledgebase_path, new_filename),
            )

# Load documents JSON
loader_json = DirectoryLoader(
    knowledgebase_path,
    glob="**/*.json",
    loader_cls=MyLoader,
)

# Loads documents PDFs
pdf_loader_kwargs={'extract_images': True}
loader_pdf = DirectoryLoader(
    knowledgebase_path,
    glob="**/*.pdf",
    loader_cls=PyPDFLoader,
)

# Load documents DOCX
loader_docx = DirectoryLoader(
    knowledgebase_path,
    glob="**/*.docx",
    loader_cls=Docx2txtLoader,
)


loader_all = MergedDataLoader(loaders=[loader_json, loader_pdf, loader_docx])

documents = loader_all.load_and_split()

db_dir_name = "faiss_db_" + datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
db_temp_folder = os.path.join(knowledgebase_path, db_dir_name)

# create db
# print("Creating db")
faiss_db = FAISS.from_documents(documents, OpenAIEmbeddings(api_key=api_key))

# save db locally
faiss_db.save_local(db_temp_folder)
# print("Db saved")
db_file_path = shutil.make_archive(db_temp_folder, "zip", db_temp_folder)
db_file_name = os.path.basename(db_file_path)

# Send the JSON output back to Node.js
output_data = {"dbVectorFilename": db_file_name}
sys.stdout.write(json.dumps(output_data))
sys.stdout.flush()
