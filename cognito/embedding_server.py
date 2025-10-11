#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Microserviço para geração de embeddings usando sentence-transformers
Este serviço recebe textos e retorna seus embeddings vetoriais
"""

import warnings
# Filtrar avisos específicos do PyTorch
warnings.filterwarnings('ignore', message='.*_register_pytree_node.*')

import os
import time
import uuid
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from sentence_transformers import SentenceTransformer
import chromadb
from contextlib import asynccontextmanager
from colorama import init, Fore, Style

# Inicializar colorama
init()

BANNER = f"""{Fore.CYAN}
 ░▒▓██████▓▒░  ░▒▓██████▓▒░          ░▒▓██████▓▒░ ░▒▓█▓▒░      ░▒▓█▓▒░        ░▒▓██████▓▒░ ░▒▓███████▓▒░  ░▒▓███████▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░       ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░        
░▒▓█▓▒░       ░▒▓█▓▒░               ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░       ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░        
░▒▓█▓▒▒▓███▓▒░░▒▓█▓▒▒▓███▓▒░        ░▒▓████████▓▒░░▒▓█▓▒░      ░▒▓█▓▒░       ░▒▓████████▓▒░░▒▓███████▓▒░  ░▒▓██████▓▒░  
░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░       ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░       ░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░       ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░       ░▒▓█▓▒░ 
 ░▒▓██████▓▒░  ░▒▓██████▓▒░ ░▒▓██▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░      ░▒▓████████▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓███████▓▒░ ░▒▓███████▓▒░  
{Fore.BLUE}
╔══════════════════════════════════════════════════════════════════════════════════╗
║                  Serviço de Embeddings - GG.AI Labs HiveAgents                   ║
║                             Sentence Transformers                                ║
╚══════════════════════════════════════════════════════════════════════════════════╝
{Style.RESET_ALL}"""

def print_status(message: str, status: str = "info"):
    colors = {
        "info": Fore.CYAN,
        "success": Fore.GREEN,
        "warning": Fore.YELLOW,
        "error": Fore.RED
    }
    color = colors.get(status, Fore.WHITE)
    print(f"{color}[{status.upper()}] {message}{Style.RESET_ALL}")

# Configurações
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
PORT = 5050

# Diretório ChromaDB
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".chroma")

# Inicializar ChromaDB client
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
# 👉 Garante que a coleção exista
try:
    chroma_client.get_collection(name="persistent_embeddings")
except Exception:
    chroma_client.create_collection(name="persistent_embeddings")

# Ciclo de vida do FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    background_tasks = BackgroundTasks()
    background_tasks.add_task(load_model)
    yield

# App FastAPI
app = FastAPI(
    title="GG.AI HiveAgents Embedding Service",
    description="Microserviço para geração de embeddings para a plataforma GG.AI HiveAgents",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

# Schemas Pydantic
class TextItem(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None

class TextBatch(BaseModel):
    texts: List[TextItem]
    model_name: Optional[str] = MODEL_NAME

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dimension: int
    processing_time: float

class QueryItem(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None

class SearchRequest(BaseModel):
    query: QueryItem
    texts: List[TextItem]
    model_name: Optional[str] = MODEL_NAME
    top_k: Optional[int] = 5
    min_similarity: Optional[float] = 0.0

class SearchResultItem(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None
    similarity: float

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    model: str
    processing_time: float

# Carrega o modelo na memória
def load_model(model_name: str = MODEL_NAME):
    global model
    if model is None or model_name != getattr(model, "model_name", ""):
        print_status(f"Carregando modelo: {model_name}", "info")
        model = SentenceTransformer("all-MiniLM-L6-v2", device="cuda")
        model.model_name = model_name
        print_status("Modelo carregado com sucesso!", "success")
    return model

@app.get("/")
async def root():
    return {"status": "online", "service": "GG.AI HiveAgents Embedding Service"}

@app.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(batch: TextBatch):
    start = time.time()
    model_name = batch.model_name or MODEL_NAME
    model = load_model(model_name)
    texts = [item.text for item in batch.texts]
    if not texts:
        raise HTTPException(400, "Nenhum texto fornecido")

    try:
        embs = model.encode(texts)
        embs_list = embs.tolist()

        if any(item.metadata and item.metadata.get("store_in_db") for item in batch.texts):
            coll = chroma_client.get_collection(name="persistent_embeddings")
            ids, docs, metas, ebs = [], [], [], []
            for item, emb in zip(batch.texts, embs_list):
                if item.metadata and item.metadata.get("store_in_db"):
                    doc_id = item.metadata.get("id", f"doc_{uuid.uuid4().hex}")
                    ids .append(doc_id)
                    docs.append(item.text)
                    m = {k: str(v) for k,v in (item.metadata or {}).items() if k!="store_in_db"}
                    metas.append(m or {"source":"unknown"})
                    ebs .append(emb)
            if docs:
                coll.add(documents=docs, embeddings=ebs, ids=ids, metadatas=metas)
    except Exception as e:
        raise HTTPException(500, f"Erro ao gerar embeddings: {e}")

    elapsed = time.time() - start
    return {
        "embeddings": embs_list,
        "model": model_name,
        "dimension": len(embs_list[0]) if embs_list else EMBEDDING_DIM,
        "processing_time": elapsed
    }

@app.get("/models")
async def list_models():
    return {
        "current_model": MODEL_NAME,
        "recommended_models": [
            {"name":"all-MiniLM-L6-v2","description":"leve/rápido (384d)","language":"multi","size_mb":80},
            {"name":"paraphrase-multilingual-MiniLM-L12-v2","description":"médio (384d)","language":"multi","size_mb":120},
            {"name":"all-mpnet-base-v2","description":"alta qualidade (768d)","language":"multi","size_mb":420}
        ]
    }

@app.post("/search", response_model=SearchResponse)
async def semantic_search(req: SearchRequest):
    start = time.time()
    model = load_model(req.model_name or MODEL_NAME)
    texts = [t.text for t in req.texts]
    if not texts:
        raise HTTPException(400, "Nenhum texto fornecido")

    try:
        col_name = f"search_{uuid.uuid4().hex[:8]}"
        coll = chroma_client.create_collection(name=col_name)
        q_emb = model.encode(req.query.text).tolist()
        c_emb = model.encode(texts).tolist()
        ids = [f"doc_{i}" for i in range(len(texts))]
        metas = []
        for i,t in enumerate(req.texts):
            m = t.metadata.copy() if t.metadata else {}
            if not m: m={"index":i}
            metas.append({k:str(v) for k,v in m.items()})
        coll.add(documents=texts, embeddings=c_emb, ids=ids, metadatas=metas)
        res = coll.query(query_embeddings=[q_emb], n_results=min(req.top_k, len(texts)), include=["documents","distances"])
        results = []
        for idx, dist in zip(res["ids"][0], res["distances"][0]):
            i = int(idx.split("_")[1])
            sim = max(0,1 - dist/2)
            if sim>=req.min_similarity:
                results.append(SearchResultItem(text=texts[i],metadata=req.texts[i].metadata,similarity=sim))
        chroma_client.delete_collection(name=col_name)
    except Exception as e:
        raise HTTPException(500, f"Erro na busca semântica: {e}")

    return SearchResponse(query=req.query.text, results=results, model=model.model_name, processing_time=time.time()-start)

@app.post("/search/documents", response_model=SearchResponse)
async def semantic_search_documents(req: SearchRequest):
    start = time.time()
    model = load_model(req.model_name or MODEL_NAME)
    if not req.texts:
        raise HTTPException(400, "Nenhum texto fornecido")

    try:
        col_name = f"docs_{uuid.uuid4().hex[:8]}"
        coll = chroma_client.create_collection(name=col_name)
        docs, ids, metas, embs = [], [], [], []
        for i,t in enumerate(req.texts):
            docs.append(t.text)
            ids.append(f"doc_{i}")
            m = t.metadata.copy() if t.metadata else {}
            if "embedding" in m: 
                emb = m.pop("embedding")
            else:
                emb = None
            metas.append({k:str(v) for k,v in m.items() or {"index":i}.items()})
            embs.append(emb)
        q_emb = model.encode(req.query.text).tolist()
        if None in embs:
            embs = model.encode(docs).tolist()
        coll.add(documents=docs, embeddings=embs, ids=ids, metadatas=metas)
        res = coll.query(query_embeddings=[q_emb], n_results=min(req.top_k,len(docs)), include=["documents","distances"])
        results = []
        for idx, dist in zip(res["ids"][0], res["distances"][0]):
            i = int(idx.split("_")[1])
            sim = max(0,1 - dist/2)
            if sim>=req.min_similarity:
                results.append(SearchResultItem(text=docs[i],metadata=req.texts[i].metadata,similarity=sim))
        chroma_client.delete_collection(name=col_name)
    except Exception as e:
        raise HTTPException(500, f"Erro na busca semântica: {e}")

    return SearchResponse(query=req.query.text, results=results, model=model.model_name, processing_time=time.time()-start)

if __name__ == "__main__":
    print(BANNER)
    print_status("Iniciando serviço de embeddings...", "info")
    load_model()
    print_status(f"Iniciando servidor na porta {PORT}...", "info")
    uvicorn.run("embedding_server:app", host="0.0.0.0", port=PORT, reload=True)
