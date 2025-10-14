import { Router } from "express";
import passport from "passport";
import authService from "../src/services/authService.js";
import { authenticateJWT, generateTokenPair } from "../middleware/auth.js";
import { logger } from "../src/utils/logger.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Renova o token de acesso usando o refresh token
 * @access  Público (mas requer refresh token válido)
 */
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: "Refresh token é obrigatório",
    });
  }

  try {
    const result = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Refresh token inválido ou expirado",
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Desconecta o usuário e invalida tokens
 * @access  Privado
 */
router.post("/logout", authenticateJWT, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];

    await authService.logout(req.user.id, token);

    res.json({
      success: true,
      message: "Logout realizado com sucesso",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erro no logout",
      message: error.message,
    });
  }
});

// ==========================================
// OAuth Routes
// ==========================================

/**
 * @route   GET /api/auth/google
 * @desc    Inicia o fluxo OAuth com Google
 * @access  Público
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback do OAuth Google
 * @access  Público
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/login?error=oauth_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      // User disponível em req.user do Passport
      const user = req.user;

      // Gerar tokens JWT
      const tokens = generateTokenPair(user);

      logger.info("Google OAuth callback successful", {
        userId: user.id,
        email: user.email,
      });

      // Redirecionar para frontend com tokens
      // Frontend irá extrair tokens da URL e armazená-los
      const redirectUrl =
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/auth/callback?` +
        `accessToken=${encodeURIComponent(tokens.accessToken)}&` +
        `refreshToken=${encodeURIComponent(tokens.refreshToken)}`;

      res.redirect(redirectUrl);
    } catch (error) {
      logger.error("Google OAuth callback failed", {
        error: error.message,
      });

      res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/login?error=oauth_callback_failed`
      );
    }
  }
);

export default router;
