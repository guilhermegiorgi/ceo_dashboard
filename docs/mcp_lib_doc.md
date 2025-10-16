# Guia rápido – Biblioteca MCP Python

Este projeto utiliza o pacote [`mcp`](https://pypi.org/project/mcp/) para
implementar o servidor FastMCP. A seguir um resumo em português do que importa
para manutenção ou extensão.

## 1. Instalação

O projeto já declara `mcp` em `server/requirements.txt`. Para experimentar a
SDK em outro projeto Python:
```bash
pip install "mcp[cli]"
```
Ou utilizando `uv` (recomendado pelos autores da SDK):
```bash
uv init meu-projeto-mcp
uv add "mcp[cli]"
```

## 2. Conceitos principais

- **FastMCP**: classe de alto nível usada em `server/src/mcp_server/server.py`
  para registrar ferramentas (`@mcp.tool()`), recursos (`@mcp.resource()`) e
  prompts (`@mcp.prompt()`).
- **Ferramentas (tools)**: chamadas RPC que executam uma função Python.
- **Recursos (resources)**: endpoints somente leitura que retornam dados
  reutilizáveis.
- **Prompts**: templates que geram instruções pré-formatadas para o modelo.
- **Contexto**: cada chamada pode acessar `ctx` (quando declarado) para obter
  informações da sessão, usuário, lifecycle etc.

## 3. Estrutura do servidor atual

```
server/src/mcp_server/server.py   # define FastMCP e registra as ferramentas
server/src/api/main.py            # expõe FastMCP via WebSocket/HTTP para IDEs
client/mcp_stdio_client.py        # bridge stdio -> WebSocket
```

Ferramentas implementadas: ver [docs/mcp_reference.md](mcp_reference.md).

## 4. Adicionando uma nova ferramenta

1. No arquivo `server/src/mcp_server/server.py`:
   ```python
   @mcp.tool()
   def minha_tool(param: str) -> dict[str, Any]:
       ...
       return {"success": True, "data": ...}
   ```
2. Se necessário, implemente a lógica em `server/src/api/vault_service.py`.
3. Atualize a camada FastAPI (`server/src/api/main.py`) para listar/call nova
   tool (mantemos as duas interfaces alinhadas).
4. Documente em `docs/mcp_reference.md` e adicione testes em
   `server/src/tests/test_mcp_server.py`.

## 5. Executando em modo desenvolvimento

- Rodar somente o servidor MCP (sem API):
  ```bash
  python server/src/mcp_server/main.py
  ```
- Via cliente stdio para IDEs: `obsidian-mcp-client` (ver README).
- Para inspecionar manualmente: `tools/mcp_inspector_test.py` ou `mcp dev`:
  ```bash
  # Executa inspector da própria SDK
  uv run mcp dev server/src/mcp_server/main.py
  ```

## 6. Transportes suportados

- **stdio**: usado quando executamos `obsidian-mcp-client` (ideal para IDEs).
- **WebSocket**: exposto pelo FastAPI em `/mcp`.
- **HTTP streamable / SSE**: suportados pela SDK, mas não configurados nesta
  stack (pode ser habilitado no futuro conforme necessário).

## 7. Recursos úteis

- [Especificação do protocolo](https://modelcontextprotocol.io)
- [Repositório oficial da SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Discussões/FAQ](https://github.com/modelcontextprotocol/python-sdk/discussions)

Com estes pontos você consegue evoluir o servidor MCP sem precisar ler toda a
especificação. Sempre que criar novas ferramentas ou mudar o fluxo de
autenticação, atualize esta documentação e os testes correspondentes.
