import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";
import { authRateLimit, generalRateLimit } from "./middleware/rateLimit";
import { agentRoutes } from "./modules/agents/agent.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { draftRoutes } from "./modules/drafts/draft.routes";
import { settingsRoutes } from "./modules/settings/settings.routes";
import { systemRoutes } from "./modules/system/system.routes";
import { taskRoutes } from "./modules/tasks/task.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(generalRateLimit);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRateLimit, authRoutes);
  app.use("/api/agents", authenticate, agentRoutes);
  app.use("/api/tasks", authenticate, taskRoutes);
  app.use("/api/drafts", authenticate, draftRoutes);
  app.use("/api/settings", authenticate, settingsRoutes);
  app.use("/api/system", authenticate, systemRoutes);

  app.use(errorHandler);

  return app;
}
