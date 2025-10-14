import fetch from "node-fetch";
import { logger } from "../src/utils/logger.js";

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com/v1";
const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

function buildUrl(baseUrl, path) {
  const sanitizedBase = baseUrl?.replace(/\/$/, "") || "";
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${sanitizedBase}${sanitizedPath}`;
}

function clamp(value, min, max) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return undefined;
  }
  return Math.min(Math.max(value, min), max);
}

function toOpenAIMessages(messages, systemPrompt) {
  const formatted = messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  if (systemPrompt) {
    formatted.unshift({ role: "system", content: systemPrompt });
  }

  return formatted;
}

function toAnthropicMessages(messages) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: [
      {
        type: "text",
        text: message.content,
      },
    ],
  }));
}

function sanitizeMaxTokens(maxTokens, fallback = 1024) {
  if (!maxTokens || Number.isNaN(maxTokens) || maxTokens <= 0) {
    return fallback;
  }
  return Math.min(maxTokens, 4096);
}

async function openAiStyleRequest({
  url,
  apiKey,
  body,
  headers = {},
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || response.statusText;
      throw new Error(`Provider error ${response.status}: ${errorMessage}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAI({ baseUrl, apiKey, messages, model, temperature, maxTokens, topP, systemPrompt }) {
  const url = buildUrl(baseUrl || OPENAI_DEFAULT_BASE_URL, "/chat/completions");
  const body = {
    model,
    messages: toOpenAIMessages(messages, systemPrompt),
  };

  if (typeof temperature === "number") {
    body.temperature = clamp(temperature, 0, 2);
  }

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  if (topP !== undefined) {
    body.top_p = clamp(topP, 0, 1);
  }

  const data = await openAiStyleRequest({ url, apiKey, body });
  const content = data?.choices?.[0]?.message?.content || "";
  const totalTokens = data?.usage?.total_tokens || 0;

  return {
    content,
    usage: data?.usage || null,
    tokensUsed: totalTokens,
  };
}

async function callOpenRouter({ baseUrl, apiKey, messages, model, temperature, maxTokens, topP, systemPrompt }) {
  const url = buildUrl(baseUrl || OPENROUTER_DEFAULT_BASE_URL, "/chat/completions");
  const body = {
    model,
    messages: toOpenAIMessages(messages, systemPrompt),
    temperature,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  if (topP !== undefined) {
    body.top_p = topP;
  }

  const headers = {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://gg.ai",
    "X-Title": process.env.OPENROUTER_APP_NAME || "CEO Dashboard",
  };

  const data = await openAiStyleRequest({ url, apiKey, body, headers });
  const content = data?.choices?.[0]?.message?.content || "";
  const totalTokens = data?.usage?.total_tokens || 0;

  return {
    content,
    usage: data?.usage || null,
    tokensUsed: totalTokens,
  };
}

async function callAnthropic({ baseUrl, apiKey, messages, model, temperature, maxTokens, topP, systemPrompt }) {
  const url = buildUrl(baseUrl || ANTHROPIC_DEFAULT_BASE_URL, "/messages");

  const body = {
    model,
    messages: toAnthropicMessages(messages),
    max_tokens: sanitizeMaxTokens(maxTokens, 1024),
  };

  if (typeof temperature === "number") {
    body.temperature = clamp(temperature, 0, 1);
  }

  if (typeof topP === "number") {
    body.top_p = clamp(topP, 0, 1);
  }

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": process.env.ANTHROPIC_API_VERSION || "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || response.statusText;
      throw new Error(`Provider error ${response.status}: ${errorMessage}`);
    }

    const textParts = data?.content?.filter?.((item) => item.type === "text") || [];
    const content = textParts.map((item) => item.text).join("\n");
    const totalTokens = data?.usage?.output_tokens || 0;

    return {
      content,
      usage: data?.usage || null,
      tokensUsed: totalTokens,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateChatCompletion({
  providerName,
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
}) {
  if (!messages?.length) {
    throw new Error("At least one message is required to generate a completion");
  }

  switch (providerName) {
    case "openai":
      return callOpenAI({ baseUrl, apiKey, messages, model, temperature, maxTokens, topP, systemPrompt });
    case "anthropic":
      return callAnthropic({ baseUrl, apiKey, messages, model, temperature, maxTokens, topP, systemPrompt });
    case "deepseek":
      return callOpenAI({
        baseUrl: baseUrl || DEEPSEEK_DEFAULT_BASE_URL,
        apiKey,
        messages,
        model,
        temperature,
        maxTokens,
        topP,
        systemPrompt,
      });
    case "openrouter":
      return callOpenRouter({ baseUrl, apiKey, messages, model, temperature, maxTokens, topP, systemPrompt });
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

export function buildSystemPrompt(conversation) {
  if (!conversation) {
    return null;
  }

  const parts = [
    "Você é o assistente estratégico do CEO Dashboard.",
    "Responda em português claro, com foco em ações práticas e contexto executivo.",
  ];

  if (conversation.context_type === "project" && conversation.project_name) {
    parts.push(
      `Contexto: esta conversa está associada ao projeto \"${conversation.project_name}\".`
    );
  }

  if (conversation.context_type === "note" && conversation.context_note_path) {
    parts.push(
      `Contexto: referencia a nota ${conversation.context_note_path}.`
    );
  }

  return parts.join(" ");
}

export function convertMessagesForLLM(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
