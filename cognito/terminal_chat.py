import os
import sys
import logging
from dotenv import load_dotenv
import chromadb
import locale
from datetime import datetime

# --- Configuração Inicial ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()



# --- Imports do LlamaIndex (Corrigidos e Verificados) ---
from llama_index.core import VectorStoreIndex, Settings, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.core.chat_engine import ContextChatEngine
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.storage.chat_store.redis import RedisChatStore
from llama_index.core.vector_stores import VectorStoreInfo, MetadataInfo
from llama_index.core.indices.vector_store import VectorIndexAutoRetriever
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.embeddings.openai import OpenAIEmbedding

# --- Imports do Projeto ---
from indexer import CHROMA_DB_PATH, OBSIDIAN_VAULT_PATH

# --- Configuração de Logging ---
logging.basicConfig(stream=sys.stdout, level=logging.WARNING)
logging.getLogger().addHandler(logging.StreamHandler(stream=sys.stdout))



def get_query_intent(query: str, llm: OpenAI) -> str:
    """Usa um LLM para classificar a intenção da consulta do usuário."""
    prompt_template = f"""
    Analise a consulta do usuário e classifique a intenção. A intenção é 'entity_search' se o usuário estiver perguntando sobre uma entidade nomeada específica (um projeto, pessoa, documento ou conceito). A intenção é 'general_query' se for uma pergunta ampla sobre tarefas, metas ou status.

    Responda APENAS com 'entity_search' ou 'general_query'.

    Consulta do Usuário: "{query}"
    Classificação:
    """
    try:
        response = llm.complete(prompt_template)
        classification = response.text.strip().lower()
        if "entity_search" in classification:
            return "entity_search"
        return "general_query"
    except Exception as e:
        print(f"[ERRO] Falha na classificação da consulta: {e}")
        return "general_query"  # Padrão para geral em caso de erro

def main():
    """Função principal para rodar o chatbot no terminal."""
    print("--- Inicializando o Clone Digital (Terminal) ---")

    # Carrega o prompt do sistema
    prompt_file_path = os.path.join(OBSIDIAN_VAULT_PATH, "1 - PROJETOS/PESSOAL/SEGUNDO CÉREBRO/PROMPT - GÊNESE.md")
    try:
        with open(prompt_file_path, 'r', encoding='utf-8') as f:
            system_prompt_base = f.read()
        print("Prompt 'GÊNESE' carregado com sucesso.")
    except FileNotFoundError:
        print(f"Erro: Arquivo de prompt '{prompt_file_path}' não encontrado.")
        sys.exit(1)

    # Adiciona a data atual ao prompt do sistema para que o bot não alucine a data.
    try:
        # Define o locale para português do Brasil para obter nomes de meses e dias da semana corretos.
        locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
    except locale.Error:
        # Fallback para ambientes onde o locale pt_BR não está instalado (comum no Windows)
        locale.setlocale(locale.LC_TIME, 'Portuguese_Brazil.1252')
    current_date = datetime.now().strftime("%A, %d de %B de %Y")
    # Adiciona a data como um fato no início do prompt para máxima prioridade e simplicidade.
    date_context = f"INFO: A data de hoje é {current_date}.\n---\n"
    system_prompt = date_context + system_prompt_base

    # Configura os serviços (LLM e Embedding)
    Settings.llm = OpenAI(model="gpt-4.1-nano", temperature=0.7)
    # Configura o modelo de embedding da OpenAI para consistência com a indexação
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    # Conecta ao ChromaDB
    db = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    chroma_collection = db.get_collection("clone_digital_vault")
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
    print(f"Conectado ao ChromaDB. {chroma_collection.count()} documentos encontrados.")

    # Descreve os metadados para o retriever autônomo
    vector_store_info = VectorStoreInfo(
        content_info="Notas pessoais de um usuário sobre vários tópicos, incluindo projetos, ideias e reflexões.",
        metadata_info=[
            MetadataInfo(
                name="active_project",
                type="str",
                description=(
                    "Uma bandeira que é a string 'yes' se a nota descreve um projeto atualmente ativo, e 'no' caso contrário. "
                    "Use um filtro para encontrar documentos onde 'active_project' é igual a 'yes' sempre que o usuário perguntar sobre seus projetos ativos."
                ),
            ),
        ],
    )

    # Define um LLM mais robusto e determinístico especificamente para o retriever,
    # que é responsável por gerar a consulta estruturada (JSON).
    retriever_llm = OpenAI(model="gpt-4o-mini", temperature=0.0)

    # Monta o motor de chat com o novo retriever autônomo e inteligente
    # --- Criação de Dois Retrievers: um para foco, outro para busca ampla ---
    # 1. Retriever Focado (Padrão): Busca apenas em projetos ativos.
    retriever_focado = VectorIndexAutoRetriever(
        index,
        vector_store_info=vector_store_info, # Usa o vector_store_info com o filtro
        similarity_top_k=10,
        llm=retriever_llm
    )

    # 2. Retriever Amplo (VectorIndexRetriever): Para buscas específicas, faz uma busca de similaridade simples sem filtros.
    retriever_amplo = VectorIndexRetriever(
        index=index,
        similarity_top_k=5,
    )

    # --- Configuração da Memória Persistente com Redis ---
    message_store = RedisChatStore(redis_url="redis://localhost:6379")
    memory = ChatMemoryBuffer.from_defaults(
        token_limit=3900,
        chat_store=message_store,
        chat_store_key="chat_history_v3" # Usa uma nova chave para forçar o reinício do histórico
    )

    # --- Criação de Dois Motores de Chat com Personalidades Distintas ---
    # Motor Focado: Usa o AutoRetriever para manter o foco em projetos ativos.
    chat_engine_focado = ContextChatEngine.from_defaults(
        retriever=retriever_focado,
        memory=memory,
        system_prompt=system_prompt,
        verbose=True,
    )

    # Motor Amplo: Usa o retriever simples para buscar em toda a base de conhecimento.
    chat_engine_amplo = ContextChatEngine.from_defaults(
        retriever=retriever_amplo,
        memory=memory, # Compartilha a mesma memória
        system_prompt=system_prompt,
        verbose=True,
    )


    print("Motor de chat pronto. Digite 'sair' para terminar.")
    print("-" * 50)

    # Loop de conversação
    while True:
        try:
            prompt = input("Você: ")
            if prompt.lower() in ['sair', 'exit', 'quit']:
                print("Clone Digital encerrando. Até a próxima!")
                break

            # Classifica a intenção e seleciona o motor de chat apropriado
            intent = get_query_intent(prompt, retriever_llm)
            if intent == 'entity_search':
                print("--- [DEBUG] Intenção: Busca por Entidade. Usando MOTOR AMPLO. ---")
                active_chat_engine = chat_engine_amplo
            else:
                print("--- [DEBUG] Intenção: Pergunta Geral. Usando MOTOR FOCADO. ---")
                active_chat_engine = chat_engine_focado

            print("Clone Digital: ", end="", flush=True)
            streaming_response = active_chat_engine.stream_chat(prompt)

            # --- [DEBUG] Imprime o contexto recuperado ---
            if streaming_response.source_nodes:
                print("\n--- [DEBUG] Contexto recuperado ---")
                for i, node in enumerate(streaming_response.source_nodes):
                    file_name = os.path.basename(node.metadata.get('file_path', 'N/A'))
                    print(f"  {i+1}. {file_name} (Score: {node.score:.4f})")
                print("-------------------------------------")
            # --------------------------------------------

            for token in streaming_response.response_gen:
                print(token, end="", flush=True)
            print("\n") # Nova linha após a resposta completa

        except KeyboardInterrupt:
            print("\nClone Digital encerrando. Até a próxima!")
            break
        except Exception as e:
            print(f"\nOcorreu um erro: {e}")

if __name__ == "__main__":
    main()
