/**
 * Passport.js Configuration
 *
 * Configures OAuth strategies (Google, GitHub, etc).
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { query, transaction } from "../database/pg-pool.js";
import { logger } from "../src/utils/logger.js";
import crypto from "crypto";

// Encryption helper for OAuth tokens
function encryptToken(token) {
  if (!token) return null;
  const algorithm = "aes-256-cbc";
  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || "change-this-to-a-32-character-key",
    "utf-8"
  ).slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Find or create user from OAuth profile
 */
async function findOrCreateOAuthUser(
  provider,
  profile,
  accessToken,
  refreshToken
) {
  return transaction(async (client) => {
    const email = profile.emails?.[0]?.value;
    const providerId = profile.id;

    if (!email) {
      throw new Error("No email found in OAuth profile");
    }

    // Check if OAuth connection already exists
    const oauthResult = await client.query(
      `SELECT user_id FROM oauth_providers
       WHERE provider = $1 AND provider_user_id = $2`,
      [provider, providerId]
    );

    if (oauthResult.rows.length > 0) {
      // OAuth connection exists - update and return user
      const userId = oauthResult.rows[0].user_id;

      // Update OAuth record
      await client.query(
        `UPDATE oauth_providers
         SET access_token = $1,
             refresh_token = $2,
             token_expires_at = NOW() + INTERVAL '1 hour',
             last_login_at = NOW(),
             raw_profile = $3,
             updated_at = NOW()
         WHERE provider = $4 AND provider_user_id = $5`,
        [
          encryptToken(accessToken),
          encryptToken(refreshToken),
          JSON.stringify(profile),
          provider,
          providerId,
        ]
      );

      // Update user picture if it changed
      const picture = profile.photos?.[0]?.value || null;
      console.log('🔍 [Passport] Updating user picture:', { userId, picture });
      
      await client.query(
        `UPDATE users
         SET picture = $1, 
             last_login_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [picture, userId]
      );

      // Get user
      const userResult = await client.query(
        `SELECT id, tenant_id, email, name, role, status, picture
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      return userResult.rows[0];
    }

    // Check if user with this email already exists
    const userResult = await client.query(
      `SELECT id, tenant_id, email, name, role, status, picture
       FROM users
       WHERE email = $1`,
      [email]
    );

    let user;

    if (userResult.rows.length > 0) {
      // User exists - link OAuth provider
      user = userResult.rows[0];

      logger.info("Linking OAuth provider to existing user", {
        userId: user.id,
        provider,
        email,
      });
    } else {
      // Create new user and tenant
      // For OAuth signup, we create a personal tenant
      const tenantSlug = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      // Create tenant
      const tenantResult = await client.query(
        `INSERT INTO tenants (name, slug, plan, status)
         VALUES ($1, $2, 'free', 'active')
         RETURNING id`,
        [
          `${profile.displayName || email}'s Workspace`,
          `${tenantSlug}-${Date.now()}`,
        ]
      );

      const tenantId = tenantResult.rows[0].id;

      // Create user
      const picture = profile.photos?.[0]?.value || null;
      console.log('🔍 [Passport] Creating new user with picture:', { email, picture });
      
      const newUserResult = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, role, status, picture, auth_provider)
         VALUES ($1, $2, $3, $4, 'admin', 'active', $5, $6)
         RETURNING id, tenant_id, email, name, role, status, picture`,
        [
          tenantId,
          email,
          "", // No password for OAuth users
          profile.displayName || email.split("@")[0],
          picture,
          provider,
        ]
      );

      user = newUserResult.rows[0];

      // Create default user settings
      await client.query(
        `INSERT INTO user_settings (tenant_id, user_id, theme, language)
         VALUES ($1, $2, 'dark', 'pt-BR')`,
        [tenantId, user.id]
      );

      logger.info("Created new user via OAuth", {
        userId: user.id,
        tenantId: tenantId,
        provider,
        email,
      });
    }

    // Create OAuth provider link
    await client.query(
      `INSERT INTO oauth_providers (
        user_id,
        provider,
        provider_user_id,
        email,
        display_name,
        profile_picture,
        access_token,
        refresh_token,
        token_expires_at,
        raw_profile,
        last_login_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '1 hour', $9, NOW())`,
      [
        user.id,
        provider,
        providerId,
        email,
        profile.displayName,
        profile.photos?.[0]?.value,
        encryptToken(accessToken),
        encryptToken(refreshToken),
        JSON.stringify(profile),
      ]
    );

    return user;
  });
}

/**
 * Configure Passport strategies
 */
export function configurePassport() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL ||
            "http://localhost:3001/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Debug: Log what Google is returning
            console.log('🔍 [Passport] Google profile received:', {
              id: profile.id,
              displayName: profile.displayName,
              emails: profile.emails,
              photos: profile.photos,
              _json: profile._json
            });
            
            const user = await findOrCreateOAuthUser(
              "google",
              profile,
              accessToken,
              refreshToken
            );

            logger.info("Google OAuth login successful", {
              userId: user.id,
              email: user.email,
              picture: user.picture,
            });

            done(null, user);
          } catch (error) {
            logger.error("Google OAuth login failed", {
              error: error.message,
              profile: profile.id,
            });
            done(error, null);
          }
        }
      )
    );
  } else {
    logger.warn(
      "Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET"
    );
  }

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const result = await query(
        `SELECT id, tenant_id, email, name, role, status, picture
         FROM users
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return done(new Error("User not found"), null);
      }

      // Convert snake_case to camelCase for compatibility
      const user = result.rows[0];
      const normalizedUser = {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        picture: user.picture,
      };

      done(null, normalizedUser);
    } catch (error) {
      done(error, null);
    }
  });

  logger.info("Passport.js configured successfully");
}

export default passport;
