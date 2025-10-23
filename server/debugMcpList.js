/**
 * Script rápido para listar ferramentas MCP usando a mesma lógica do servidor.
 * Executa: node server/debugMcpList.js
 */

import mcpSessionManager from "./services/mcpSessionManager.js";

async function main() {
  try {
    console.log("🔐 BRAINCLOUD_BASE_URL:", process.env.BRAINCLOUD_BASE_URL);
    console.log("🔐 BRAINCLOUD_API_TOKEN length:", process.env.BRAINCLOUD_API_TOKEN?.length || 0);

    const session = await mcpSessionManager.createSession(["debug-cli"]);
    console.log("✅ Sessão MCP aberta:", session.sessionId);
    console.log("🔧 Total de ferramentas:", session.llmTools.length);
    console.log(
      session.llmTools
        .slice(0, 10)
        .map((tool) => `- ${tool.function.name}`)
        .join("\n")
    );
  } catch (err) {
    console.error("❌ Falha ao listar ferramentas MCP:", err);
  }
}

main();
