import sys
import time
import logging
import os

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv
from llama_index.core import Settings

# Importa os componentes necessários do nosso script indexer
from indexer import run_indexing, CustomEmbedding, EMBEDDING_SERVER_URL

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

# Carregar variáveis de ambiente
load_dotenv()
OBSIDIAN_VAULT_PATH = os.getenv("OBSIDIAN_VAULT_PATH")

class MarkdownEventHandler(FileSystemEventHandler):
    """Um handler de eventos que reage a mudanças em arquivos Markdown."""
    def __init__(self):
        self.last_triggered = 0
        self.debounce_period = 10  # segundos

    def on_any_event(self, event):
        """Dispara a reindexação em qualquer evento de arquivo .md, com debounce."""
        if event.is_directory or not event.src_path.endswith(".md"):
            return

        current_time = time.time()
        if current_time - self.last_triggered > self.debounce_period:
            logging.info(f"Evento detectado: {event.event_type} em {event.src_path}. Disparando reindexação...")
            try:
                run_indexing()
            except Exception as e:
                logging.error(f"Ocorreu um erro durante a reindexação: {e}")
            self.last_triggered = current_time
        else:
            logging.info("Evento ignorado devido ao debounce.")

def main():
    """Função principal para iniciar o monitoramento."""
    if not OBSIDIAN_VAULT_PATH or not os.path.exists(OBSIDIAN_VAULT_PATH):
        logging.error(f"Caminho do vault do Obsidian não encontrado ou inválido: {OBSIDIAN_VAULT_PATH}")
        sys.exit(1)

    # Configura o modelo de embedding globalmente, essencial para run_indexing
    logging.info("Configurando o ambiente para o indexador...")
    Settings.embed_model = CustomEmbedding(server_url=EMBEDDING_SERVER_URL)
    Settings.llm = None

    event_handler = MarkdownEventHandler()
    observer = Observer()
    observer.schedule(event_handler, OBSIDIAN_VAULT_PATH, recursive=True)
    
    logging.info(f"🤖 Iniciando monitoramento do diretório: {OBSIDIAN_VAULT_PATH}")
    logging.info("O sistema irá reindexar automaticamente 10 segundos após qualquer mudança em arquivos .md.")
    logging.info("Pressione Ctrl+C para parar.")
    
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        logging.info("Monitoramento encerrado pelo usuário.")
    observer.join()

if __name__ == "__main__":
    main()
