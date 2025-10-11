from llama_index.llms.openai import OpenAI
from llama_index.llms.gemini import Gemini

from custom_chat_store import CustomRedisChatStore
from llama_index.vector_stores.chroma import ChromaVectorStore

# --- Configuração Inicial ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

# --- Imports do Projeto ---
from indexer import CHROMA_DB_PATH, OBSIDIAN_VAULT_PATH

# --- Configuração de Logging ---
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler(stream=sys.stdout))

class RAGService:
    """Encapsula toda a lógica de RAG (Retrieval-Augmented Generation)."""

    def __init__(self):
        print("--- Inicializando o RAGService ---")
        self._load_system_prompt()
        # Configuração padrão com OpenAI para garantir retrocompatibilidade
        self._configure_default_settings()
        self._connect_vector_store()
        if not self.index:
            print("AVISO: Índice não carregado. Use o endpoint /api/index para construir.")
        print("--- RAGService pronto ---")

    def _configure_default_settings(self):
        """Configura o LLM e o modelo de embedding padrão (OpenAI)."""
        self.default_llm = OpenAI(model="gpt-4o-mini", temperature=0.7)
        self.default_embed_model = OpenAIEmbedding(model="text-embedding-3-small")
        Settings.llm = self.default_llm
        Settings.embed_model = self.default_embed_model

    def _load_system_prompt(self):
        """Carrega e prepara o prompt do sistema a partir do arquivo GÊNESE."""
        prompt_file_path = os.path.join(OBSIDIAN_VAULT_PATH, "1 - PROJETOS/PESSOAL-GUILHERME/PROJETO - SEGUNDO CÉREBRO/DOCUMENTAÇÃO/PROMPT - Gênese.md")
        try:
            with open(prompt_file_path, 'r', encoding='utf-8') as f:
                system_prompt_base = f.read()
            print("Prompt 'GÊNESE' carregado com sucesso.")
        except FileNotFoundError:
            print(f"ERRO CRÍTICO: Arquivo de prompt '{prompt_file_path}' não encontrado.")
            sys.exit(1)

        try:
            locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
        except locale.Error:
            locale.setlocale(locale.LC_TIME, 'Portuguese_Brazil.1252')
        current_date = datetime.now().strftime("%A, %d de %B de %Y")
        date_context = f"INFO: A data de hoje é {current_date}.\n---\n"
        self.system_prompt = date_context + system_prompt_base


    def _connect_vector_store(self):
        """Tenta carregar um índice vetorial existente a partir do armazenamento."""
        try:
            db = chromadb.PersistentClient(path=CHROMA_DB_PATH)
            chroma_collection = db.get_or_create_collection("clone_digital_vault")
            vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
            self.storage_context = StorageContext.from_defaults(vector_store=vector_store)
            self.index = VectorStoreIndex.from_storage(self.storage_context)
            print(f"Índice carregado com sucesso do ChromaDB.")
        except Exception:
            self.index = None

    def rebuild_index(self):
        """Lê os documentos do vault e reconstrói o índice."""
        print("--- Reconstruindo índice... ---")
        documents = SimpleDirectoryReader(
            input_dir=OBSIDIAN_VAULT_PATH, file_extractor={ ".md": FlatReader() }, recursive=True
        ).load_data()
        
        self.index = VectorStoreIndex.from_documents(
            documents,
            storage_context=self.storage_context,
            show_progress=True
        )
        print("--- Reconstrução do índice concluída. ---")

    async def query(self, user_prompt: Union[str, List[Dict]], session_id: str, provider: str, model: str, api_key: str, temperature: float):
        """
        Processa uma consulta (string ou histórico) usando um provedor de IA específico.
        """
        print(f"--- [API-QUERY] Provedor: {provider}, Modelo: {model} ---")

        # 1. Seleciona ou configura o LLM com base nos parâmetros
        if provider == 'google':
            llm = Gemini(model_name=model, api_key=api_key, temperature=temperature)
        else: # Padrão para OpenAI ou se não especificado
            # Se uma chave de API específica for fornecida, cria uma nova instância
            if api_key:
                llm = OpenAI(model=model, api_key=api_key, temperature=temperature)
            else: # Caso contrário, usa a instância padrão
                llm = self.default_llm
                llm.temperature = temperature # Ajusta a temperatura da instância padrão
                llm.model = model # Ajusta o modelo da instância padrão

        # 2. Lidar com o histórico de conversa
        if isinstance(user_prompt, list):
            last_user_message = next((msg['content'] for msg in reversed(user_prompt) if msg['role'] == 'user'), None)
            if not last_user_message:
                raise ValueError("Histórico de chat inválido, sem mensagem do usuário.")
            
            response = await llm.acomplete(last_user_message)
            return response.text
        else:
            response = await llm.acomplete(user_prompt)
            return response.text

# Singleton: cria uma única instância do serviço para ser usada pela API
rag_service_instance = RAGService()
