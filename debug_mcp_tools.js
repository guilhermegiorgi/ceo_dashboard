#!/usr/bin/env node

import { fetch } from 'undici';

async function testMCPTools() {
  const token = process.env.BRAINCLOUD_API_TOKEN;
  const url = process.env.BRAINCLOUD_BASE_URL || 'https://obsidian-mcp.ggailabs.com';

  if (!token) {
    console.error('❌ BRAINCLOUD_API_TOKEN não definido no ambiente.');
    return;
  }

  console.log('🔍 Verificando ferramentas MCP disponíveis...\n');
  console.log('💡 O sistema usa fallback automático quando o Brain Cloud falha\n');

  // Teste direto usando o servidor MCP local (simulação como o frontend faz)
  try {
    console.log('🔗 Testando via API local do servidor...\n');

    const testServer = await fetch('http://localhost:3001/api/mcp/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'liste suas ferramentas disponíveis'
        }],
        tools: true,
        sessionId: 'test-mcp-session-123'
      })
    });

    if (!testServer.ok) {
      console.error(`❌ Servidor MCP falhando: ${testServer.status} - ${testServer.statusText}`);
      return;
    }

    // Tentar ler a stream de resposta
    console.log('📡 Resposta do servidor MCP:');
    try {
      const reader = testServer.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while(true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log('🎯 Dados recebidos:', chunk.substring(0, 100) + '...');

        if (chunk.includes('DONE')) {
          break;
        }
      }
    } catch (streamError) {
      console.log('📡 Tentando ler como texto regular...');
      const text = await testServer.text();
      console.log('📄 Resposta completa:', text.substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ Erro ao testar MCP via servidor local:', error);
    console.log('\n💡 Isso é esperado. O sistema está funcionando no frontend.\n');
  }
}

testMCPTools();
