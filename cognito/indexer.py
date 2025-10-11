import os
import requests
import logging
import sys
from typing import List, Any

from dotenv import load_dotenv
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import yaml

def extract_markdown_metadata(file_path: str) -> dict:
    """Extrai metadados do frontmatter YAML de um arquivo markdown."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) > 2:
                    frontmatter = parts[1]
                    parsed_metadata = yaml.safe_load(frontmatter)
                    if isinstance(parsed_metadata, dict):
                        return parsed_metadata
    except Exception:
        pass  # Ignora erros, retorna metadados vazios
    return {}

import chromadb
import tiktoken

# Configuração de logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler(stream=sys.stdout))

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# --- Configurações ---
OBSIDIAN_VAULT_PATH = os.getenv("OBSIDIAN_VAULT_PATH")
CHROMA_DB_PATH = "./chroma_db"
EMBEDDING_SERVER_URL = "http://127.0.0.1:5050/embeddings"

def run_indexing():
    """
    Executa o processo de carregamento de documentos e criação/atualização do índice vetorial.
    Assume que as configurações globais (Settings) já foram definidas.
    """
    logging.info(f"Carregando documentos de: {OBSIDIAN_VAULT_PATH}")
    
    reader = SimpleDirectoryReader(
        input_dir=OBSIDIAN_VAULT_PATH,
        required_exts=[".md"],
        recursive=True,
        exclude=["**/1 - PROJETOS/SERVIDOR EMBEDDINGS/**", "**/TEMPLATES/**"],
        file_metadata=extract_markdown_metadata  # Usa a função customizada
    )
    documents = reader.load_data()

    # --- Transformação de Metadados para Compatibilidade com Filtros ---
    print("Pré-processando metadados para filtros...")

    for doc in documents:
        # 1. Extract tags for logic, handling both list and string formats.
        tags_list = []
        if doc.metadata and 'tags' in doc.metadata:
            tags_value = doc.metadata['tags']
            if isinstance(tags_value, list):
                tags_list = [str(tag).strip() for tag in tags_value]
            elif isinstance(tags_value, str):
                tags_list = [tag.strip() for tag in tags_value.split(',')]

        # 2. Set the active_project flag based on the extracted tags.
        if 'projetos/ativos' in tags_list:
            doc.metadata['active_project'] = "yes"
        else:
            doc.metadata['active_project'] = "no"
            
        # 3. Sanitize all metadata for ChromaDB compatibility *after* all logic is done.
        if doc.metadata:
            for key, value in list(doc.metadata.items()):
                if isinstance(value, list):
                    doc.metadata[key] = ", ".join(map(str, value))
                elif not isinstance(value, (str, int, float, type(None))):
                    del doc.metadata[key]
    print("Pré-processamento concluído.")

    
    # Calcula e loga o total de tokens para ter uma ideia do volume
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        total_tokens = sum(len(encoding.encode(doc.text)) for doc in documents)
        logging.info(f"{len(documents)} documentos carregados, totalizando aproximadamente {total_tokens:,} tokens.")
    except Exception as e:
        logging.warning(f"Não foi possível calcular os tokens: {e}")
        logging.info(f"{len(documents)} documentos carregados.")

    # Inicializa o ChromaDB
    db = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    # Garante uma operação atômica: apaga a coleção antiga se ela existir.
    try:
        if "clone_digital_vault" in [c.name for c in db.list_collections()]:
            logging.info("Coleção 'clone_digital_vault' existente encontrada. Removendo para garantir uma indexação limpa.")
            db.delete_collection(name="clone_digital_vault")
    except Exception as e:
        logging.error(f"Erro ao tentar remover a coleção existente: {e}")

    logging.info("Criando uma nova coleção 'clone_digital_vault'.")
    chroma_collection = db.get_or_create_collection("clone_digital_vault")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    
    # Cria o índice a partir dos documentos
    logging.info("Iniciando a criação do índice vetorial. Isso pode levar alguns minutos...")
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_documents(
        documents, storage_context=storage_context, embed_model=Settings.embed_model
    )
    logging.info(f"Indexação concluída. {len(documents)} documentos foram processados e salvos no ChromaDB.")

    logging.info("Indexação concluída com sucesso!")
    logging.info(f"Banco de dados vetorial salvo em: {CHROMA_DB_PATH}")

def main():
    """Função principal para executar a indexação a partir da linha de comando."""
    # Validação do caminho
    if not OBSIDIAN_VAULT_PATH or not os.path.exists(OBSIDIAN_VAULT_PATH):
        logging.error(f"Caminho do vault do Obsidian não encontrado ou inválido: {OBSIDIAN_VAULT_PATH}")
        sys.exit(1)
    
    # Configura o modelo de embedding da OpenAI
    print("Usando modelo de embedding da OpenAI: 'text-embedding-3-small'")
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    Settings.llm = None  # Não precisamos de um LLM para a indexação

    # Executa a lógica de indexação
    run_indexing()

if __name__ == "__main__":
    main()
