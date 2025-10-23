import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log('[DEBUG] /api/chat hit!');
  console.log('[DEBUG] Headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    const body = await req.json();
    console.log('[DEBUG] Body:', body);
    
    // ALWAYS try to use MCP backend first, fallback only on error
    const useDemoFallback = false; // Changed: Don't use demo fallback by default
    
    console.log('[DEBUG] Use demo fallback:', useDemoFallback);
    
    if (useDemoFallback) {
      // Fallback: responder com demo quando não autenticado
      const demoStream = new ReadableStream({
        async start(controller) {
          try {
            // Mensagem de boas-vindas profissionais
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({
              type: 'text-delta',
              textDelta: "🌟 Olá! Sou o assistente do GG.AI, integrado ao Segundo Cérebro MCP. Como posso ajudar você hoje?\n\n✅ **Integração MCP**: Conectado ao Brain Cloud via proxy\n✅ **Streaming MCP**: Respostas em tempo real\n✅ **Ferramentas MCP**: Acesso a dados do Obsidian\n✅ **Raciocínio**: Pensamento visível do assistente.\n\n💡 Modo de demonstração - configure autenticação para acesso completo do MCP.\n\n🔗 Para começar: Faça login ou configure Bearer tokens em ambiente."
            }) + '\n\n'));
            
            // Simular um pouco de atraso para efeito de pensamento
            await new Promise(resolve => setTimeout(resolve, 500));
            
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      const demoResponse = new Response(demoStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      } as Response);

      return demoResponse;
    }

    // Connect to MCP backend (no auth required for local development)
    const mcpUrl = 'http://localhost:3002/api/mcp/chat/stream';
    const mcpHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only include Authorization if present
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader) {
      mcpHeaders['Authorization'] = authHeader;
    }

    console.log('[DEBUG] Connecting to MCP backend:', mcpUrl);
    console.log('[DEBUG] MCP Headers:', mcpHeaders);
    
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: mcpHeaders,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('[DEBUG] MCP Backend error:', response.status, response.statusText);
      
      // Tentar fallback demo se backend falhar
      const fallbackStream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({
              type: 'error',
              error: `Backend MCP error: ${response.statusText}`
            }) + '\n\n'));
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });
      
      const fallbackResponse = new Response(fallbackStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
      
      return fallbackResponse;
    }

    // Retornar o stream do MCP diretamente quando conexão funcionar
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error in /api/chat:', error);
    
    // Fallback com erro se tudo falhar
    const errorStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({
            type: 'error',
            error: `Error: ${error.message}`
          }) + '\n\n'));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(errorStream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Accept': '*/*',
      }
    });
  }
}

export const maxDuration = 30;
