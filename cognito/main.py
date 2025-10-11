from typing import List, Dict, Union
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# Importa a instância única do nosso serviço de RAG
# A inicialização do serviço (carregar modelos, etc.) acontece no momento da importação.
from rag_service import rag_service_instance
from security import get_api_key

# --- Modelos de Dados (Pydantic) ---
class QueryRequest(BaseModel):
    """Modelo para a requisição de uma consulta."""
    prompt: Union[str, List[Dict[str, str]]] # Aceita string ou histórico de chat
    session_id: str = "default_session"
    # Novos campos para controle do agente
    provider: str = 'google'
    model: str = None
    apiKey: str = None
    temperature: float = 0.7

class HealthResponse(BaseModel):
    """Modelo para a resposta do health check."""
    status: str

# --- Configuração da Aplicação FastAPI ---
app = FastAPI(
    title="Cognito API",
    description="API para interagir com o Segundo Cérebro usando um sistema RAG avançado.",
    version="1.0.0",
)

# --- Endpoints da API ---

@app.get(
    "/health", 
    tags=["Status"], 
    summary="Verifica a saúde da API",
    response_model=HealthResponse
)
async def health_check(api_key: str = Depends(get_api_key)):
    """
    Endpoint simples para verificar se a API está online e respondendo.
    """
    return {"status": "ok"}

@app.post(
    "/api/query",
    tags=["Cognito"],
    summary="Envia uma consulta para o motor RAG"
)
async def query_rag(request: QueryRequest, api_key: str = Depends(get_api_key)):
    """
    Recebe uma pergunta (prompt) ou um histórico de conversa e um ID de sessão, 
    processa usando o motor RAG e retorna a resposta.
    """
    try:
        # A verificação do índice pode ser desnecessária para agentes que não usam RAG
        # if not rag_service_instance.index:
        #     raise HTTPException(status_code=503, detail="Índice não está pronto. Use o endpoint /api/index.")

        # O stream_query agora precisa lidar com os novos parâmetros
        response = await rag_service_instance.query(
            user_prompt=request.prompt, 
            session_id=request.session_id,
            provider=request.provider,
            model=request.model,
            api_key=request.apiKey,
            temperature=request.temperature
        )
        # Retorna uma resposta JSON em vez de streaming por enquanto para simplificar
        return JSONResponse(content={"answer": response})
    except Exception as e:
        print(f"Erro na API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/index")
def index_rag(api_key: str = Depends(get_api_key)):
    """Dispara a reconstrução do índice de vetores a partir dos documentos do vault."""
    try:
        rag_service_instance.rebuild_index()
        return JSONResponse(status_code=200, content={"message": "Reconstrução do índice concluída com sucesso."})
    except Exception as e:
        print(f"Erro ao reconstruir o índice: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao reconstruir o índice: {str(e)}")
