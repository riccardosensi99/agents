import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { verifyDiscordSignature } from "../../services/discord/discordClient";
import { processDiscordInteraction } from "../../services/discord/discordApprovalService";
import { discordInteractionSchema } from "./discord.schemas";

export const discordRoutes = Router();

const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;
const INTERACTION_RESPONSE_DEFERRED_UPDATE_MESSAGE = 6;

discordRoutes.post(
  "/interactions",
  asyncHandler(async (req, res) => {
    if (!env.DISCORD_ENABLED) {
      res.json({ ok: true, ignored: true, reason: "discord_disabled" });
      return;
    }

    const signature = req.header("x-signature-ed25519");
    const timestamp = req.header("x-signature-timestamp");

    if (!verifyDiscordSignature((req as any).rawBody, signature, timestamp)) {
      throw new AppError(401, "Invalid Discord interaction signature");
    }

    const interaction = discordInteractionSchema.parse(req.body);

    if (interaction.type === INTERACTION_TYPE_PING) {
      res.json({ type: 1 });
      return;
    }

    if (interaction.type !== INTERACTION_TYPE_MESSAGE_COMPONENT) {
      res.json({ type: 4, data: { content: "Interazione non supportata.", flags: 64 } });
      return;
    }

    res.json({ type: INTERACTION_RESPONSE_DEFERRED_UPDATE_MESSAGE });

    processDiscordInteraction(interaction).catch((error) => {
      console.warn("discord.interaction_processing_failed", {
        message: error instanceof Error ? error.message : "unknown"
      });
    });
  })
);
