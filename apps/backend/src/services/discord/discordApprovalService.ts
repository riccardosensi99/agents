import type { z } from "zod";
import { prisma } from "../../db/prisma";
import { AppError, notFound } from "../../lib/errors";
import { env } from "../../config/env";
import { applyDraftDecision } from "../drafts/draftApprovalService";
import { regenerateDraft } from "../drafts/draftRevisionService";
import type { discordInteractionSchema } from "../../modules/discord/discord.schemas";
import {
  disableDiscordMessageButtons,
  isDiscordConfigured,
  sendDiscordButtonsMessage,
  sendDiscordFollowupMessage
} from "./discordClient";

const db = prisma as any;

type DiscordCallbackAction = "approve" | "reject" | "revise";

type DiscordInteraction = z.infer<typeof discordInteractionSchema>;

const RISK_COLOR: Record<string, number> = {
  low: 0x2ecc71,
  medium: 0xf1c40f,
  high: 0xe74c3c
};

const truncate = (value: string, max = 1600) => (value.length > max ? `${value.slice(0, max - 3)}...` : value);

function callbackId(action: DiscordCallbackAction, draftId: string) {
  return `draft:${action}:${draftId}`;
}

function parseCustomId(value: string | undefined) {
  if (!value) {
    throw new AppError(400, "Missing Discord custom_id");
  }

  const [scope, action, draftId] = value.split(":");

  if (!action || scope !== "draft" || !["approve", "reject", "revise"].includes(action) || !draftId) {
    throw new AppError(400, "Invalid Discord custom_id");
  }

  return {
    action: action as DiscordCallbackAction,
    draftId
  };
}

export async function notifyDiscordDraftReady(draftId: string) {
  if (!isDiscordConfigured()) {
    return { skipped: true };
  }

  const draft = await db.draft.findUnique({
    where: { id: draftId },
    include: { agent: true, task: true }
  });

  if (!draft) {
    throw notFound("Draft");
  }

  if (draft.status !== "waiting_approval") {
    return { skipped: true, reason: "not_waiting_approval" };
  }

  return sendDiscordButtonsMessage({
    embed: {
      title: truncate(draft.title, 250),
      description: truncate(draft.content, 3800),
      color: (draft.riskLevel && RISK_COLOR[draft.riskLevel]) ?? 0x95a5a6,
      fields: [
        { name: "Piattaforma", value: draft.platform, inline: true },
        { name: "Agente", value: draft.agent?.name ?? "Agent", inline: true },
        { name: "Supervisor score", value: `${draft.supervisorScore ?? "-"}/10`, inline: true },
        { name: "Risk", value: draft.riskLevel ?? "-", inline: true },
        { name: "Azione consigliata", value: draft.recommendedAction ?? "-", inline: true }
      ]
    },
    buttons: [
      { id: callbackId("approve", draft.id), label: "Approva", style: 3 },
      { id: callbackId("reject", draft.id), label: "Rifiuta", style: 4 },
      { id: callbackId("revise", draft.id), label: "Chiedi revisione", style: 2 }
    ]
  });
}

export async function processDiscordInteraction(interaction: DiscordInteraction) {
  const respond = (content: string) =>
    sendDiscordFollowupMessage(interaction.application_id, interaction.token, content);

  const disableButtons = (statusLine: string) => {
    const messageId = interaction.message?.id;

    if (!messageId) {
      return Promise.resolve();
    }

    return disableDiscordMessageButtons(
      interaction.message?.channel_id ?? env.DISCORD_CHANNEL_ID ?? "",
      messageId,
      statusLine
    );
  };

  const { action, draftId } = parseCustomId(interaction.data?.custom_id);
  const interactionId = interaction.id;
  const clickedBy = interaction.member?.user?.id ?? interaction.user?.id;
  const payload = { interactionId, action, draftId, clickedBy };

  if (action === "revise") {
    const existingAction = await db.discordApprovalAction.findUnique({
      where: { callbackId: interactionId }
    });

    if (existingAction) {
      await respond("Azione gia registrata.");
      await disableButtons("Azione gia registrata.");
      return;
    }

    const draft = await db.draft.findUnique({ where: { id: draftId } });

    if (!draft) {
      throw notFound("Draft");
    }

    if (draft.status !== "waiting_approval") {
      await respond("Bozza gia processata.");
      await disableButtons(`Bozza gia processata (stato: ${draft.status}).`);
      return;
    }

    await regenerateDraft({
      draftId,
      userId: null,
      action: "request_revision",
      comment: "Richiesta revisione da Discord"
    });

    await db.discordApprovalAction.create({
      data: {
        draftId,
        callbackId: interactionId,
        action: "request_revision",
        status: "applied",
        message: "Richiesta revisione da Discord",
        payload
      }
    });

    await respond("Revisione richiesta.");
    await disableButtons("Revisione richiesta — nuova bozza in arrivo.");
    return;
  }

  const result = await applyDraftDecision({
    draftId,
    userId: null,
    action: action === "approve" ? "approve" : "reject",
    comment: action === "approve" ? "Approvata da Discord" : "Rifiutata da Discord",
    source: "discord",
    idempotencyKey: interactionId,
    payload
  });

  const statusLine = result.ignored
    ? "Bozza gia processata."
    : action === "approve"
      ? "Bozza approvata."
      : "Bozza rifiutata.";

  await respond(statusLine);
  await disableButtons(statusLine);
}
