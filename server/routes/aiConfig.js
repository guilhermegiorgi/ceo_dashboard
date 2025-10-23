import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.js";
import {
  getUserAIConfig,
  sanitizeConfigForClient,
  getModelConfigForUser,
} from "../services/aiConfigService.js";
import { aiProviderRouter } from "../services/aiProviderRouter.js";

const router = Router();

router.get("/", authenticateJWT, async (req, res, next) => {
  try {
    const config = await getUserAIConfig(req.user);
    res.json({
      success: true,
      config: sanitizeConfigForClient(config),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/test", authenticateJWT, async (req, res, next) => {
  try {
    const { context = "chat", prompt = "Teste de conexão do provedor." } =
      req.body || {};

    const modelConfig = await getModelConfigForUser(req.user, context);

    await aiProviderRouter.routeChat({
      user: req.user,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      systemPrompt:
        "Você é um assistente de teste. Responda com uma frase curta confirmando a conexão.",
      context,
      overrides: req.body?.selection || {},
      stream: false,
    });

    res.json({
      success: true,
      provider: modelConfig.provider,
      model: modelConfig.model,
      fallbackUsed: modelConfig.fallbackUsed || false,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
