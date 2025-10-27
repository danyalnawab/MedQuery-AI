import streamlit as st
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

st.title("JARDVIS MK I")
st.caption("Beta")

def main():

    # Load environment variables
    #load_dotenv()
    #api_key = os.getenv("OPENAI_API_KEY")
    #if not api_key:
    #   raise RuntimeError("❌ OPENAI_API_KEY not found in .env")
    #^ above not needed for streamlit

    api_key = st.secrets["OPENAI_API_KEY"]

    # Prepare the Db
        # Embedding functions is the same function used to create the database
    embedding_function = OpenAIEmbeddings()
    db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding_function)

    query_text = st.text_input("Enter question: ")
    while query_text != "Exit":
        # Search the DB
        results = db.similarity_search_with_relevance_scores(query_text, k=3)
        if len(results) == 0 or results[0][1] < 0.7:
                # print(f"Unable to find matching results.")
                return

        # Result of the search containing the document and its relevance score
        context_text = "\n\n---\n\n".join([doc.page_content for doc, _score in results])
        prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
        prompt = prompt_template.format(context=context_text, question=query_text) # Context is pulled from journals and query text is pulled from user
        
        model = ChatOpenAI()
        response_text = model.predict(prompt)

        # Below is for sources back to journals (pulls their metadata)
        sources = [doc.metadata.get("source", None) for doc, _score in results]

        formatted_response = f"\nResponse: {response_text}\n\nSources: {sources}"
        st.write(formatted_response) #formatted response is output ***IMPORTANT*** for streamlit
        query_text = ""
    
if __name__ == "__main__":
      main()