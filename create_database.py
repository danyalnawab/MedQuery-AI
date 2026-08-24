from langchain_community.document_loaders import DirectoryLoader, TextLoader              # Used to load .md into python
from langchain.text_splitter import RecursiveCharacterTextSplitter  # Used to split documents
from langchain.schema import Document                               # Used in split_text function
from langchain_community.vectorstores.chroma import Chroma
import os
import shutil


from langchain_openai import OpenAIEmbeddings
import openai

from dotenv import load_dotenv  # used to load environment variables

load_dotenv()
openai.api_key = os.environ['OPENAI_API_KEY']


DATA_PATH = "data/Integrative Medicine" ## DEL TS used globally
CHROMA_PATH = "chroma"                  ## DEL TS used later globally ig idk

def main():
    generate_data_store()

def generate_data_store():             ## DEL TS helper function to clean things up
    documents = load_documents()
    chunks = split_text(documents)
    save_to_chroma(chunks)



def load_documents():                           # textloader
    loader = DirectoryLoader(DATA_PATH,
                              glob="**/*.md",    # **/*.md matches every .md in any subfolder; (restricted to md via "**/*.md" but can be other file types if changed)
                                recursive=True,   # recursive=True allows deep traversal of all nested folders
                                loader_cls=TextLoader, ## DEL makes it simpler as I am only reading md files and the otehr was throwing me an error
                                loader_kwargs={"encoding": "utf-8"}
                            )  
    documents = loader.load()
    return documents

# To split documents into chunks
def split_text(documents : list[Document]):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=500,
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    return chunks

def save_to_chroma(chunks: list[Document]):
    # Clear out the database first
    if os.path.exists(CHROMA_PATH):
        shutil.rmtree(CHROMA_PATH)
    
    # Create a new DB from the documents.
    db = Chroma.from_documents(
        chunks, OpenAIEmbeddings(), persist_directory=CHROMA_PATH
    )
    db.persist()
    print(f"Saved {len(chunks)} chunks to {CHROMA_PATH}")

if __name__ == "__main__":
    main()