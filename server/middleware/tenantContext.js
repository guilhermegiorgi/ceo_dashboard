/**
 * Tenant Context Middleware
 *
 * Sets tenant and user context for database queries with Row-Level Security (RLS).
 * This middleware should run after authentication middleware.
 */

import { logger } from "../src/utils/logger.js";

/**
 * Attach tenant context to request
 * Ensures all subsequent database queries are scoped to the user's tenant
 */
export const setTenantContext = (req, res, next) => {
  if (!req.user) {
    return next(); // Skip if no user authenticated
  }

  // Attach tenant context that will be used by database queries
  req.dbContext = {
    tenantId: req.user.tenantId,
    userId: req.user.id,
  };

  logger.debug("Tenant context set", {
    tenantId: req.user.tenantId,
    userId: req.user.id,
    path: req.path,
  });

  next();
};

/**
 * Verify tenant access
 * Ensures the user has access to the requested tenant
 */
export const verifyTenantAccess = (req, res, next) => {
  const requestedTenantId = req.params.tenantId || req.body.tenantId;

  if (!requestedTenantId) {
    return next(); // No specific tenant requested
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Check if user's tenant matches requested tenant
  if (req.user.tenantId !== requestedTenantId) {
    logger.warn("Tenant access denied", {
      userId: req.user.id,
      userTenant: req.user.tenantId,
      requestedTenant: requestedTenantId,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Access denied to this tenant",
    });
  }

  next();
};

/**
 * Get database query helper with tenant context
 * Usage: const query = req.getQuery();
 */
export const attachQueryHelper = (req, res, next) => {
  if (!req.dbContext) {
    req.dbContext = {};
  }

  // Attach helper to execute queries with tenant context
  req.getDbContext = () => ({
    tenantId: req.dbContext.tenantId,
    userId: req.dbContext.userId,
  });

  next();
};

/**
 * Combined tenant middleware
 * Sets context, verifies access, and attaches query helper
 */
export const tenantMiddleware = [
  setTenantContext,
  attachQueryHelper,
  verifyTenantAccess,
];

export default {
  setTenantContext,
  verifyTenantAccess,
  attachQueryHelper,
  tenantMiddleware,
};
