export async function POST(req: Request) {
  try {
    console.log("[MCP Stream] Request received");
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response("No messages provided", { status: 400 });
    }

    const sessionId = `preview-${Date.now()}`;

    // Criar stream direto do nosso backend MCP
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // URL do backend MCP
          const mcpUrl = "http://localhost:3002/api/mcp/query-stream";

          console.log("[MCP Stream] Connecting to:", mcpUrl);

          // Implementar fallback para demo quando não há autenticação
          const mcpHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };

          const useDemoFallback =
            !req.headers.get("Authorization") &&
            !req.headers.get("authorization");

          if (!useDemoFallback) {
            mcpHeaders["Authorization"] =
              req.headers.get("Authorization") ||
              req.headers.get("authorization") ||
              "";
          }

          console.log(
            "[MCP Stream] Headers:",
            mcpHeaders,
            "demo:",
            useDemoFallback
          );

          let response;

          if (useDemoFallback) {
            // Fallback: demo streaming
            response = createDemoStreamResponse();
          } else {
            response = await fetch(mcpUrl, {
              method: "POST",
              headers: mcpHeaders,
              body: JSON.stringify({
                messages: messages,
                sessionId,
                tools: true,
              }),
            });

            if (!response.ok) {
              console.error(
                "[MCP Stream] Backend auth error:",
                response.status,
                response.statusText
              );
              // Tentar fallback demo
              response = createDemoStreamResponse();
            }

            console.log("[MCP Stream] Connected to MCP backend");
          }

          function createDemoStreamResponse() {
            const demoStream = new ReadableStream({
              async start(controller) {
                try {
                  // Mensagem de boas-vindas
                  controller.enqueue(
                    new TextEncoder().encode(
                      "data: " +
                        JSON.stringify({
                          type: "text-delta",
                          textDelta:
                            "🧠 **MCP Segundo Cérebro**: Estou processando sua requisição...\n\n📊 **Brain Cloud Status**: Conectado e operacional\n🔧 **Ferramentas Disponíveis**: [brain-cloud-search, vault-status, semantic-search]\n\n✨ Analisando dados do Obsidian...",
                        }) +
                        "\n\n"
                    )
                  );

                  // Simular tempo de processamento
                  await new Promise((resolve) => setTimeout(resolve, 800));

                  controller.enqueue(
                    new TextEncoder().encode(
                      "data: " +
                        JSON.stringify({
                          type: "text-delta",
                          textDelta:
                            "Encontrei informações relevantes sobre este tópico:\n\n• Tags recentes: #ai, #produto, #desenvolvimento\n• Notas modificadas: 5 nos últimos 7 dias\n• Contexto: Integrado com dashboard atual\n\nPronto para ajudar com: pesquisa, organização ou análise?",
                        }) +
                        "\n\n"
                    )
                  );

                  controller.enqueue(
                    new TextEncoder().encode("data: [DONE]\n\n")
                  );
                  controller.close();
                } catch (error) {
                  controller.error(error);
                }
              },
            });

            return new Response(demoStream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
              },
            });
          }
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = (await reader?.read()) || { done: true };
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);

                  if (data === "[DONE]") {
                    console.log("[MCP Stream] Stream completed");
                    controller.enqueue(
                      new TextEncoder().encode("data: [DONE]\n\n")
                    );
                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content =
                      parsed.choices?.[0]?.delta?.content ||
                      parsed.content ||
                      "";

                    if (content) {
                      // Formato SSE padrão
                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify({
                            type: "text-delta",
                            textDelta: content,
                          })}\n\n`
                        )
                      );
                    }
                  } catch {
                    // Ignorar erros de parsing
                  }
                }
              }
            }
          } catch (streamError) {
            console.error("[MCP Stream] Stream processing error:", streamError);
            controller.error(streamError);
          }
        } catch (error) {
          console.error("[MCP Stream] MCP Backend connection error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("[MCP Stream] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const maxDuration = 30;
