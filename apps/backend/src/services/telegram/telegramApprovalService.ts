import { prisma } from "../../db/prisma";
import { AppError, notFound } from "../../lib/errors";
import { applyDraftDecision } from "../drafts/draftApprovalService";
import { regenerateDraft } from "../drafts/draftRevisionService";
import { answerTelegramCallback, isTelegramConfigured, sendTelegramMessage } from "./telegramClient";

const db = prisma as any;

type TelegramCallbackAction = "approve" | "reject" | "revise";

type TelegramCallback = {
  id: string;
  data?: string;
  message?: {
    chat?: {
      id?: number | string;
    };
  };
};

type TelegramUpdate = {
  callback_query?: TelegramCallback;
};

const truncate = (value: string, max = 1600) => (value.length > max ? `${value.slice(0, max - 3)}...` : value);

function callbackData(action: TelegramCallbackAction, draftId: string) {
  return `draft:${action}:${draftId}`;
}

function parseCallbackData(value: string | undefined) {
  if (!value) {
    throw new AppError(400, "Missing Telegram callback data");
  }

  const [scope, action, draftId] = value.split(":");

  if (!action || scope !== "draft" || !["approve", "reject", "revise"].includes(action) || !draftId) {
    throw new AppError(400, "Invalid Telegram callback data");
  }

  return {
    action: action as TelegramCallbackAction,
    draftId
  };
}

export async function notifyTelegramDraftReady(draftId: string) {
  if (!isTelegramConfigured()) {
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

  const text = [
    "Bozza pronta per approvazione",
    "",
    `Titolo: ${draft.title}`,
    `Piattaforma: ${draft.platform}`,
    `Agente: ${draft.agent?.name ?? "Agent"}`,
    `Supervisor score: ${draft.supervisorScore ?? "-"}/10`,
    `Risk: ${draft.riskLevel ?? "-"}`,
    `Azione consigliata: ${draft.recommendedAction ?? "-"}`,
    "",
    "Feedback Overseer:",
    truncate(draft.supervisorFeedback ?? "Nessun feedback registrato.", 700),
    "",
    "Contenuto:",
    truncate(draft.content)
  ].join("\n");

  return sendTelegramMessage({
    text,
    buttons: [
      [
        { text: "Approva", callback_data: callbackData("approve", draft.id) },
        { text: "Rifiuta", callback_data: callbackData("reject", draft.id) }
      ],
      [{ text: "Chiedi revisione", callback_data: callbackData("revise", draft.id) }]
    ]
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const callback = update.callback_query;

  if (!callback) {
    return { ok: true, ignored: true, reason: "no_callback" };
  }

  const { action, draftId } = parseCallbackData(callback.data);
  const payload = {
    callbackId: callback.id,
    action,
    draftId,
    chatId: callback.message?.chat?.id
  };

  if (action === "revise") {
    const existingAction = await db.telegramApprovalAction.findUnique({
      where: { callbackId: callback.id }
    });

    if (existingAction) {
      await answerTelegramCallback(callback.id, "Azione gia registrata.");
      return { ok: true, idempotent: true };
    }

    const result = await regenerateDraft({
      draftId,
      userId: null,
      action: "request_revision",
      comment: "Richiesta revisione da Telegram"
    });

    await db.telegramApprovalAction.create({
      data: {
        draftId,
        callbackId: callback.id,
        action: "request_revision",
        status: "applied",
        message: "Richiesta revisione da Telegram",
        payload
      }
    });

    await answerTelegramCallback(callback.id, "Revisione richiesta.");
    return { ok: true, draft: result.draft };
  }

  const result = await applyDraftDecision({
    draftId,
    userId: null,
    action: action === "approve" ? "approve" : "reject",
    comment: action === "approve" ? "Approvata da Telegram" : "Rifiutata da Telegram",
    source: "telegram",
    idempotencyKey: callback.id,
    payload
  });

  await answerTelegramCallback(
    callback.id,
    result.ignored ? "Bozza gia processata." : action === "approve" ? "Bozza approvata." : "Bozza rifiutata."
  );

  return { ok: true, ...result };
}
