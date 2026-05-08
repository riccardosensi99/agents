import { env } from "../../config/env";

type InlineButton = {
  text: string;
  callback_data: string;
};

type SendMessageParams = {
  text: string;
  buttons?: InlineButton[][];
};

const telegramApiUrl = (method: string) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

export function isTelegramConfigured() {
  return Boolean(env.TELEGRAM_ENABLED && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramMessage(params: SendMessageParams) {
  if (!env.TELEGRAM_ENABLED) {
    return { skipped: true, reason: "disabled" as const };
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn("telegram.not_configured", {
      botToken: env.TELEGRAM_BOT_TOKEN ? "configured" : "missing",
      chatId: env.TELEGRAM_CHAT_ID ? "configured" : "missing"
    });
    return { skipped: true, reason: "missing_config" as const };
  }

  const response = await fetch(telegramApiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: params.text,
      disable_web_page_preview: true,
      ...(params.buttons
        ? {
            reply_markup: {
              inline_keyboard: params.buttons
            }
          }
        : {})
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    console.warn("telegram.send_failed", {
      status: response.status,
      description: payload?.description ?? "unknown"
    });
    return { skipped: false, ok: false, status: response.status };
  }

  return { skipped: false, ok: true };
}

export async function answerTelegramCallback(callbackQueryId: string, text: string) {
  if (!env.TELEGRAM_ENABLED || !env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  await fetch(telegramApiUrl("answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false
    })
  }).catch((error) => {
    console.warn("telegram.callback_answer_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
  });
}
