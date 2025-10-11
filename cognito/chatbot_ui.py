import streamlit as st
import os
import sys
import logging
import chromadb
from llama_index.core import VectorStoreIndex, Settings, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore
from llama_index.core.query_bundle import QueryBundle
from typing import List, Optional
from dotenv import load_dotenv

# --- Custom Post-Processor para garantir documentos únicos ---
class UniqueDocumentPostprocessor(BaseNodePostprocessor):
    """Remove nós duplicados com base no file_path para garantir diversidade de fontes."""
    def _postprocess_nodes(
        self, nodes: List[NodeWithScore], query_bundle: Optional[QueryBundle] = None
    ) -> List[NodeWithScore]:
        seen_docs = set()
        unique_nodes = []
        for node in nodes:
            doc_id = node.metadata.get('file_path')
            if doc_id not in seen_docs:
                unique_nodes.append(node)
                seen_docs.add(doc_id)
        return unique_nodes


# Adiciona o diretório raiz ao path e carrega variáveis de ambiente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from indexer import CustomEmbedding, EMBEDDING_SERVER_URL, CHROMA_DB_PATH, OBSIDIAN_VAULT_PATH

# --- Configuração de Logging ---
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler(stream=sys.stdout))

# --- Constantes ---
PROMPT_GENESE_PATH = os.path.join(OBSIDIAN_VAULT_PATH, "2 - ÁREAS/PESSOAL/PROMPT - GÊNESE.md")

# --- Funções Core ---
@st.cache_resource
def load_chat_engine():
    """Carrega e cacheia o motor de chat para evitar recarregamentos."""
    if not os.path.exists(CHROMA_DB_PATH) or not os.getenv("OPENAI_API_KEY"):
        st.error("Banco de dados Chroma ou chave da OpenAI não encontrados. Verifique o .env e execute o indexer.py.")
        return None

    # Carrega o prompt de sistema
    try:
        with open(PROMPT_GENESE_PATH, 'r', encoding='utf-8') as f:
            system_prompt = f.read()
    except FileNotFoundError:
        st.error(f"Arquivo de prompt Gênese não encontrado em: {PROMPT_GENESE_PATH}")
        return None

    # Configura o modelo de embedding e o LLM globalmente
    Settings.embed_model = CustomEmbedding(server_url=EMBEDDING_SERVER_URL)
    Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.5, system_prompt=system_prompt)

    # Conecta ao ChromaDB
    db = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    chroma_collection = db.get_collection("clone_digital_vault")
    doc_count = chroma_collection.count()
    logging.info(f"Conectado ao ChromaDB. Coleção 'clone_digital_vault' contém {doc_count} documentos.")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
    
    # Cria o motor de chat de forma explícita para garantir o controle sobre a recuperação
    retriever = index.as_retriever(similarity_top_k=10)
    chat_engine = CondensePlusContextChatEngine.from_defaults(
        retriever=retriever,
        system_prompt=system_prompt,
        node_postprocessors=[UniqueDocumentPostprocessor()],
        streaming=True
    )
    logging.info("Motor de CHAT (explícito) carregado com sucesso.")
    return chat_engine

# --- Interface do Streamlit ---
st.set_page_config(page_title="Clone Digital", page_icon="🤖", layout="centered")

st.title("🤖 Converse com seu Clone Digital")
st.caption("Faça uma pergunta sobre suas anotações do Obsidian e a IA buscará as informações mais relevantes.")

# Carrega o motor de chat
chat_engine = load_chat_engine()

if chat_engine:
    # Inicializa o histórico do chat
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Exibe as mensagens do histórico
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Input do usuário
    if prompt := st.chat_input("Qual a sua pergunta?"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Gera e exibe a resposta da IA
        with st.chat_message("assistant"):
            response_placeholder = st.empty()
            
            streaming_response = chat_engine.stream_chat(prompt)

            # Log detalhado dos documentos recuperados para depuração
            logging.info("--- Documentos recuperados para o contexto ---")
            if streaming_response.source_nodes:
                for node in streaming_response.source_nodes:
                    file_name = os.path.basename(node.metadata.get('file_path', 'N/A'))
                    logging.info(f"- {file_name} (Score: {node.score:.4f})")
            else:
                logging.info("Nenhum documento recuperado.")
            logging.info("-------------------------------------------")
            
            # Exibe a resposta em streaming
            full_response = response_placeholder.write_stream(streaming_response.response_gen)

            # Exibe as fontes após a resposta
            source_nodes = streaming_response.source_nodes
            if source_nodes:
                with st.expander("Fontes Utilizadas"):
                    for node in source_nodes:
                        file_name = os.path.basename(node.metadata.get('file_path', 'N/A'))
                        st.markdown(f"- **Arquivo:** `{file_name}` (Score: {node.score:.4f})")

        # Adiciona a resposta completa ao histórico
        st.session_state.messages.append({"role": "assistant", "content": full_response})
else:
    st.warning("O motor de busca não pôde ser carregado. Verifique os logs e a configuração.")
