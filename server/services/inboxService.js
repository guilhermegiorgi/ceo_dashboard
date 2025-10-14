import brainCloudClient from "./brainCloudClient.js";
import { logger } from "../src/utils/logger.js";

const DEFAULT_INBOX_DIRECTORY =
  process.env.BRAINCLOUD_INBOX_DIR || "5 - INSIGHTS-IA/Inbox";
const MAX_BATCH_SIZE = 25;

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.files)) return value.files;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
};

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const extractFrontMatterBlock = (content) => {
  if (!content || typeof content !== "string") {
    return { frontmatter: null, body: content || "" };
  }
  const match = content.match(FRONTMATTER_REGEX);
  if (match) {
    const frontmatter = match[0].replace(/\r/g, "").trimEnd();
    const body = content.slice(match[0].length).replace(/^\r?\n/, "");
    return { frontmatter, body };
  }
  return { frontmatter: null, body: content };
};

const extractTitle = (content, fallback) => {
  if (content) {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) {
        return trimmed.replace(/^#+\s*/, "").trim() || fallback;
      }
      if (trimmed.length > 0 && !trimmed.startsWith(">")) {
        return trimmed.slice(0, 120);
      }
    }
  }
  return fallback;
};

const extractSnippet = (content) => {
  if (!content || typeof content !== "string") return null;
  const cleaned = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const snippet = cleaned.slice(0, 360).trim();
  return snippet.length === 0 ? null : snippet;
};

export const listInboxNotes = async ({ limit = 15 } = {}) => {
  const enforcedLimit = Math.max(1, Math.min(limit, MAX_BATCH_SIZE));
  try {
    const listing = await brainCloudClient.listFiles(DEFAULT_INBOX_DIRECTORY);
    const files = toArray(listing)
      .filter(
        (item) =>
          item &&
          typeof item.path === "string" &&
          item.path.toLowerCase().endsWith(".md")
      )
      .sort((a, b) => {
        const aDate = new Date(a.modified || a.updated_at || a.created_at || 0);
        const bDate = new Date(b.modified || b.updated_at || b.created_at || 0);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, enforcedLimit);

    const filepaths = files.map((file) => file.path);
    let contents = [];
    if (filepaths.length > 0) {
      const batch = await brainCloudClient.batchGet(filepaths, true);
      contents = toArray(batch);
    }

    const contentMap = new Map(
      contents
        .filter((item) => item && typeof item.path === "string")
        .map((item) => [item.path, item])
    );

    const notes = files.map((file) => {
      const info = contentMap.get(file.path) || {};
      const rawContent = info.content || "";
      const { body } = extractFrontMatterBlock(rawContent);
      const fallbackTitle =
        file.name ||
        file.basename ||
        (file.path
          ? file.path.split("/").pop()?.replace(/\.md$/i, "")
          : "Nota");
      const cleanedBody = body.trim();
      const title = extractTitle(cleanedBody, fallbackTitle);
      const snippet =
        extractSnippet(cleanedBody) ||
        "Nenhum conteúdo encontrado nesta nota. Abra no vault para revisar.";
      return {
        path: file.path,
        title,
        snippet,
        modified:
          file.modified ||
          info.modified ||
          file.updated_at ||
          info.updated_at ||
          null,
        created: file.created_at || info.created_at || null,
        size: file.size || info.size || null,
      };
    });

    return {
      directory: DEFAULT_INBOX_DIRECTORY,
      notes,
    };
  } catch (error) {
    logger.error("Failed to list inbox notes", {
      directory: DEFAULT_INBOX_DIRECTORY,
      error: error.message,
    });
    throw error;
  }
};

export const getInboxNoteContent = async (path) => {
  if (!path || typeof path !== "string") {
    throw new Error("Inbox note path is required");
  }

  try {
    const file = await brainCloudClient.getFile(path);

    console.log("[Inbox Debug Backend] Path:", path);
    console.log(
      "[Inbox Debug Backend] File response keys:",
      Object.keys(file || {})
    );
    console.log(
      "[Inbox Debug Backend] Has file.frontmatter:",
      !!file?.frontmatter
    );
    console.log(
      "[Inbox Debug Backend] frontmatter type:",
      typeof file?.frontmatter
    );

    // A API pode retornar o frontmatter já parseado como objeto
    let frontmatterText = null;
    const rawContent = file?.content || "";

    // Se a API retorna frontmatter como objeto, converta para YAML
    if (file?.frontmatter && typeof file.frontmatter === "object") {
      console.log(
        "[Inbox Debug Backend] Frontmatter as object detected, converting to YAML"
      );
      frontmatterText =
        "---\n" +
        Object.entries(file.frontmatter)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}:\n  - ${value.join("\n  - ")}`;
            }
            return `${key}: ${JSON.stringify(value)}`;
          })
          .join("\n") +
        "\n---";
    } else {
      // Caso contrário, tenta extrair do conteúdo
      const { frontmatter } = extractFrontMatterBlock(rawContent);
      frontmatterText = frontmatter;
    }

    const { body } = extractFrontMatterBlock(rawContent);

    console.log(
      "[Inbox Debug Backend] Final frontmatter found:",
      frontmatterText ? "YES" : "NO"
    );
    if (frontmatterText) {
      console.log(
        "[Inbox Debug Backend] Frontmatter preview:",
        frontmatterText.substring(0, 150)
      );
    }

    return {
      path,
      title: extractTitle(body, path),
      content: body,
      frontmatter: frontmatterText,
      rawContent,
      modified: file?.modified || null,
      size: file?.size || null,
    };
  } catch (error) {
    logger.error("Failed to load inbox note content", {
      path,
      error: error.message,
    });
    throw error;
  }
};

export default {
  listInboxNotes,
  getInboxNoteContent,
};
