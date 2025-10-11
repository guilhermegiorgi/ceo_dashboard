import json
import redis
from typing import List, Optional

from llama_index.core.llms import ChatMessage
from llama_index.core.storage.chat_store import BaseChatStore

class CustomRedisChatStore(BaseChatStore):
    """
    Uma implementação personalizada e corrigida de um Chat Store usando Redis.
    Armazena o histórico de conversas para cada sessão.
    """
    def __init__(self, redis_url: str = "redis://localhost:6379", redis_client: Optional[redis.Redis] = None):
        """Inicializa a conexão com o Redis."""
        if redis_client:
            self._redis_client = redis_client
        else:
            self._redis_client = redis.from_url(redis_url)
        self._session_id: Optional[str] = None

    @property
    def session_id(self) -> Optional[str]:
        return self._session_id

    @session_id.setter
    def session_id(self, session_id: str):
        self._session_id = session_id

    def _get_key(self, session_id: str) -> str:
        """Cria a chave do Redis para uma dada sessão."""
        return f"chat_history:{session_id}"

    def set_messages(self, session_id: str, messages: List[ChatMessage]) -> None:
        """Salva uma lista de mensagens para uma sessão."""
        key = self._get_key(session_id)
        json_messages = [msg.dict() for msg in messages]
        self._redis_client.set(key, json.dumps(json_messages))

    def get_messages(self, session_id: str) -> List[ChatMessage]:
        """Recupera as mensagens de uma sessão."""
        key = self._get_key(session_id)
        json_val = self._redis_client.get(key)
        if not json_val:
            return []
        
        dict_messages = json.loads(json_val)
        return [ChatMessage(**msg) for msg in dict_messages]

    def add_message(self, session_id: str, message: ChatMessage) -> None:
        """Adiciona uma nova mensagem ao histórico de uma sessão."""
        messages = self.get_messages(session_id)
        messages.append(message)
        self.set_messages(session_id, messages)

    def delete_messages(self, session_id: str) -> Optional[List[ChatMessage]]:
        """Deleta o histórico de uma sessão."""
        key = self._get_key(session_id)
        messages = self.get_messages(session_id)
        self._redis_client.delete(key)
        return messages

    def delete_message(self, session_id: str, message_idx: int) -> Optional[ChatMessage]:
        """Deleta uma mensagem específica de uma sessão (não implementado)."""
        # Esta funcionalidade é complexa e não é essencial para o nosso caso de uso.
        return None

    def delete_last_message(self, session_id: str) -> Optional[ChatMessage]:
        """Deleta a última mensagem de uma sessão."""
        messages = self.get_messages(session_id)
        if not messages:
            return None
        last_message = messages.pop()
        self.set_messages(session_id, messages)
        return last_message

    def get_keys(self) -> List[str]:
        """Retorna todas as chaves de sessão."""
        return [key.decode('utf-8') for key in self._redis_client.scan_iter("chat_history:*")]
