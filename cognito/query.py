import os
import sys
import logging
import textwrap
from typing import List, Any

import requests
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.embeddings import BaseEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

# Configuração de logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler(stream=sys.stdout))

# Carregar variáveis de ambiente
load_dotenv()

# --- Configurações ---
CHROMA_DB_PATH = "./chroma_db"
EMBEDDING_SERVER_URL = "http://127.0.0.1:5050/embeddings"

class CustomEmbedding(BaseEmbedding):
    """Classe para conectar ao nosso servidor de embeddings FastAPI customizado."""
    server_url: str

    def _get_text_embedding(self, text: str) -> List[float]:
        response = requests.post(self.server_url, json={"texts": [{"text": text}]})
        response.raise_for_status()
        return response.json()["embeddings"][0]

    def _get_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        response = requests.post(self.server_url, json={"texts": [{"text": t} for t in texts]})
        response.raise_for_status()
        return response.json()["embeddings"]

    def _get_query_embedding(self, query: str) -> List[float]:
        return self._get_text_embedding(query)

    async def _aget_query_embedding(self, query: str) -> List[float]:
        return self._get_query_embedding(query)

def main():
    """Função principal para executar uma consulta no índice."""
    if len(sys.argv) < 2:
        print("Uso: python query.py \"Sua pergunta aqui\"")
        sys.exit(1)

    query_text = sys.argv[1]

    # Configura o modelo de embedding globalmente
    Settings.embed_model = CustomEmbedding(server_url=EMBEDDING_SERVER_URL)
    Settings.llm = None  # Não precisamos de um LLM para a consulta RAG

    # Conecta ao banco de dados vetorial existente
    db = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    chroma_collection = db.get_or_create_collection("clone_digital_vault")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    
    # Carrega o índice a partir do armazenamento
    index = VectorStoreIndex.from_vector_store(vector_store)

    # Cria o motor de consulta (query engine)
    query_engine = index.as_query_engine(similarity_top_k=5)

    logging.info(f"\n🔍 Consultando o índice com a pergunta: '{query_text}'")
    response = query_engine.query(query_text)

    print("\n💬 Resposta Encontrada:")
    print(textwrap.fill(str(response), 100))

    print("\n📚 Fontes:")
    for node in response.source_nodes:
        print(f"  - Nota: {node.metadata.get('file_name', 'N/A')}")
        print(f"    Similaridade: {node.score:.4f}")
        print("    Trecho:")
        print(textwrap.fill(node.get_content(), 100, initial_indent='      ', subsequent_indent='      '))
        print("---")

if __name__ == "__main__":
    main()
