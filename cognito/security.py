import os
from dotenv import load_dotenv
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

load_dotenv()

API_KEY_NAME = "X-API-Key"
API_KEY = os.getenv("COGNITO_API_KEY")

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_from_header: str = Security(api_key_header)):
    """Verifica se a chave de API enviada no cabeçalho é válida."""
    if not API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chave de API não configurada no servidor."
        )

    if api_key_from_header == API_KEY:
        return api_key_from_header
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chave de API inválida ou ausente."
        )
