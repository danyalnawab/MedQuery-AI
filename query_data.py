import argparse
import os
from dotenv import load_dotenv
# from dataclasses import dataclass
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

CHROMA_PATH = "chroma"

PROMPT_TEMPLATE = """
Answer the question based only on the following context:

{context}

---

Answer the question based on the above context: {question}
"""

def main():
    # Argument parser so input querytext in command line
    parser = argparse.ArgumentParser()
    parser.add_argument("query_text", type=str, help="The query text.")
    args = parser.parse_args()
    query_text = args.query_text

    # Load environment variables
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("❌ OPENAI_API_KEY not found in .env")


    # Prepare the Db
        # Embedding functions is the same function used to create the database
    embedding_function = OpenAIEmbeddings()
    db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding_function)

    # Search the DB
    results = db.similarity_search_with_relevance_scores(query_text, k=3) # Search for chunk that best matches query
    # ^ returns 3 best matches for the query (result is a list of tuples with a document containing its relevance score)
    # Check, returns if there are no matches or relevance score of 1st result is below a certain threshold
    if len(results) == 0 or results[0][1] < 0.7:
            print(f"Unable to find matching results.")
            return

    # Return type of search
    # List[Tuple[Document, float]]        # Result of the search containing the document and its relevance score
    context_text = "\n\n---\n\n".join([doc.page_content for doc, _score in results]) # Context for the bot (relevant data chunks for openAi)
    # ^ use this data to give to chatgpt to create a response
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context_text, question=query_text) # Context is pulled from journals and query text is pulled from user
    
    model = ChatOpenAI()
    response_text = model.predict(prompt)

    # Below is for sources back to journals (pulls their metadata)
    sources = [doc.metadata.get("source", None) for doc, _score in results]

    formatted_response = f"\nResponse: {response_text}\n\nSources: {sources}"
    print(formatted_response) #formatted response is output ***IMPORTANT*** for streamlit
    
if __name__ == "__main__":
      main()