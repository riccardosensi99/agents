import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { validateBody } from "../../middleware/validate";
import { handleTelegramUpdate } from "../../services/telegram/telegramApprovalService";
import { telegramWebhookSchema } from "./telegram.schemas";

export const telegramRoutes = Router();

telegramRoutes.post(
  "/webhook",
  validateBody(telegramWebhookSchema),
  asyncHandler(async (req, res) => {
    if (!env.TELEGRAM_ENABLED) {
      res.json({ ok: true, ignored: true, reason: "telegram_disabled" });
      return;
    }

    const providedSecret = req.header("x-telegram-bot-api-secret-token");

    if (!env.TELEGRAM_WEBHOOK_SECRET || providedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new AppError(403, "Invalid Telegram webhook secret");
    }

    const result = await handleTelegramUpdate(req.body);
    res.json({ data: result });
  })
);
