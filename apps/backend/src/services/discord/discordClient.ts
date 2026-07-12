import crypto from "node:crypto";
import { env } from "../../config/env";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

type MessageButton = {
  id: string;
  label: string;
  style?: 1 | 2 | 3 | 4;
};

type MessageEmbed = {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

type SendButtonsParams = {
  embed: MessageEmbed;
  buttons: MessageButton[];
};

export function isDiscordConfigured() {
  return Boolean(env.DISCORD_ENABLED && env.DISCORD_BOT_TOKEN && env.DISCORD_CHANNEL_ID);
}

function buildButtonsComponents(buttons: MessageButton[]) {
  return [
    {
      type: 1,
      components: buttons.slice(0, 5).map((button) => ({
        type: 2,
        style: button.style ?? 2,
        label: button.label.slice(0, 80),
        custom_id: button.id
      }))
    }
  ];
}

async function callDiscordApi(method: "POST" | "PATCH", path: string, body: Record<string, unknown>) {
  if (!env.DISCORD_ENABLED) {
    return { skipped: true, reason: "disabled" as const };
  }

  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CHANNEL_ID) {
    console.warn("discord.not_configured", {
      botToken: env.DISCORD_BOT_TOKEN ? "configured" : "missing",
      channelId: env.DISCORD_CHANNEL_ID ? "configured" : "missing"
    });
    return { skipped: true, reason: "missing_config" as const };
  }

  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    console.warn("discord.api_call_failed", {
      method,
      path,
      status: response.status,
      error: payload?.message ?? "unknown"
    });
    return { skipped: false, ok: false, status: response.status };
  }

  return { skipped: false, ok: true };
}

export async function sendDiscordTextMessage(content: string) {
  return callDiscordApi("POST", `/channels/${env.DISCORD_CHANNEL_ID}/messages`, { content });
}

export async function sendDiscordButtonsMessage(params: SendButtonsParams) {
  return callDiscordApi("POST", `/channels/${env.DISCORD_CHANNEL_ID}/messages`, {
    embeds: [params.embed],
    components: buildButtonsComponents(params.buttons)
  });
}

export async function disableDiscordMessageButtons(channelId: string, messageId: string, statusLine: string) {
  return callDiscordApi("PATCH", `/channels/${channelId}/messages/${messageId}`, {
    content: statusLine,
    components: []
  });
}

export async function sendDiscordFollowupMessage(applicationId: string, interactionToken: string, content: string) {
  const response = await fetch(`${DISCORD_API_BASE}/webhooks/${applicationId}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, flags: 64 })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    console.warn("discord.followup_failed", {
      status: response.status,
      error: payload?.message ?? "unknown"
    });
    return { ok: false, status: response.status };
  }

  return { ok: true };
}

export function verifyDiscordSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  timestampHeader: string | undefined
) {
  if (!env.DISCORD_PUBLIC_KEY || !rawBody || !signatureHeader || !timestampHeader) {
    return false;
  }

  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(env.DISCORD_PUBLIC_KEY, "hex")]),
      format: "der",
      type: "spki"
    });

    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestampHeader), rawBody]),
      publicKey,
      Buffer.from(signatureHeader, "hex")
    );
  } catch (error) {
    console.warn("discord.signature_verification_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return false;
  }
}
