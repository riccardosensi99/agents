import OpenAI from "openai";
import type { z } from "zod";
import { aiProvider, env } from "../../config/env";
import { safeErrorMessage } from "../../lib/redact";

export type AiGenerateInput = {
  system: string;
  prompt: string;
  temperature?: number;
  responseFormat?: "text" | "json";
  operation?: string;
  taskId?: string;
  agentSlug?: string;
  draftId?: string;
};

export type AiClient = {
  provider: "mock" | "openai";
  generateText(input: AiGenerateInput): Promise<string>;
  generateJson<T>(input: AiGenerateInput, schema: z.ZodSchema<T>): Promise<T>;
};

const jsonFromText = (value: string) => {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const match = value.match(/\{[\s\S]*\}/);
  return match ? match[0] : value;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

abstract class BaseAiClient implements AiClient {
  abstract readonly provider: "mock" | "openai";
  abstract generateText(input: AiGenerateInput): Promise<string>;

  async generateJson<T>(input: AiGenerateInput, schema: z.ZodSchema<T>) {
    const raw = await this.generateText({ ...input, responseFormat: "json" });
    const parsed = JSON.parse(jsonFromText(raw));
    return schema.parse(parsed);
  }
}

class MockAiClient extends BaseAiClient {
  public readonly provider = "mock" as const;

  async generateText(input: AiGenerateInput) {
    const startedAt = Date.now();
    const system = input.system.toLowerCase();
    const finish = (output: string) => {
      console.info("ai.call.completed", {
        provider: this.provider,
        model: "mock-deterministic",
        operation: input.operation ?? "generate",
        taskId: input.taskId,
        agentSlug: input.agentSlug,
        draftId: input.draftId,
        durationMs: Date.now() - startedAt,
        promptChars: input.prompt.length,
        outputChars: output.length
      });
      return output;
    };

    if (system.includes("supervisor")) {
      return finish(JSON.stringify({
        qualityScore: 8,
        riskLevel: "low",
        feedback:
          "Bozza coerente con un posizionamento da freelance tecnico. Tono chiaro, nessuna promessa rischiosa, buon margine per renderla piu personale.",
        recommendedAction: "approve"
      }));
    }

    if (system.includes("linkedin")) {
      return finish(JSON.stringify({
        title: "Docker nei progetti freelance",
        content: [
          "Docker non e solo comodita: nei progetti freelance riduce attrito tra sviluppo, staging e produzione.",
          "",
          "Quando un cliente mi chiede rapidita, voglio poter replicare l'ambiente in minuti, non inseguire differenze tra macchine.",
          "",
          "Tre vantaggi pratici:",
          "- onboarding tecnico piu rapido",
          "- deploy piu prevedibili",
          "- debug piu pulito quando il progetto cresce",
          "",
          "Il valore non e il container in se, ma la disciplina operativa che porta nel progetto."
        ].join("\n"),
        metadata: {
          hook: "Docker non e solo comodita",
          cta: "Se vuoi rendere un progetto piu prevedibile, parti dall'ambiente.",
          angle: "operational reliability"
        }
      }));
    }

    if (system.includes("instagram")) {
      return finish(JSON.stringify({
        title: "3 idee Instagram per servizi full-stack",
        content: [
          "Hook: Il problema non e solo scrivere codice. E consegnare un prodotto che resta stabile quando va online.",
          "",
          "Caption: Se sei freelance o founder, una dashboard fatta bene non si misura solo dalla UI.",
          "Si misura da API chiare, database solido, deploy ripetibile e manutenzione semplice.",
          "",
          "3 idee contenuto:",
          "1. Carousel: da demo a prodotto deployabile",
          "2. Reel: 3 segnali che il tuo progetto ha bisogno di Docker",
          "3. Post: stack full-stack pragmatico per una piccola SaaS",
          "",
          "CTA: Se vuoi trasformare una demo in qualcosa che puoi davvero usare, parliamone."
        ].join("\n"),
        metadata: {
          hook: "Il problema non e solo scrivere codice",
          cta: "Parliamone",
          hashtags: ["#fullstack", "#freelance", "#docker", "#webdevelopment"],
          ideas: ["carousel demo-to-product", "reel Docker signals", "stack post"]
        }
      }));
    }

    return finish(JSON.stringify({
      title: "Internal agent output",
      content: `Bozza generata per: ${input.prompt}`,
      metadata: {}
    }));
  }
}

class OpenAiClient extends BaseAiClient {
  public readonly provider = "openai" as const;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey, timeout: env.OPENAI_TIMEOUT_MS });
  }

  override async generateJson<T>(input: AiGenerateInput, schema: z.ZodSchema<T>) {
    const startedAt = Date.now();

    try {
      return await super.generateJson(input, schema);
    } catch (error) {
      console.warn("ai.call.fallback_to_mock", {
        provider: this.provider,
        operation: input.operation ?? "generate",
        taskId: input.taskId,
        agentSlug: input.agentSlug,
        draftId: input.draftId,
        durationMs: Date.now() - startedAt,
        error: safeErrorMessage(error, "Unknown AI error")
      });
      return new MockAiClient().generateJson(input, schema);
    }
  }

  async generateText(input: AiGenerateInput) {
    const startedAt = Date.now();
    console.info("ai.call.started", {
      provider: this.provider,
      model: env.OPENAI_MODEL,
      operation: input.operation ?? "generate",
      taskId: input.taskId,
      agentSlug: input.agentSlug,
      draftId: input.draftId,
      responseFormat: input.responseFormat ?? "text",
      promptChars: input.prompt.length
    });

    const request: any = {
      model: env.OPENAI_MODEL,
      temperature: input.temperature ?? 0.4,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt }
      ]
    };

    if (input.responseFormat === "json") {
      request.response_format = { type: "json_object" };
    }

    try {
      const completion = await withTimeout(
        this.client.chat.completions.create(request),
        env.OPENAI_TIMEOUT_MS,
        "OpenAI request"
      );

      console.info("ai.call.completed", {
        provider: this.provider,
        model: env.OPENAI_MODEL,
        operation: input.operation ?? "generate",
        taskId: input.taskId,
        agentSlug: input.agentSlug,
        draftId: input.draftId,
        durationMs: Date.now() - startedAt,
        outputChars: completion.choices[0]?.message?.content?.length ?? 0
      });

      return completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      console.warn("ai.call.failed", {
        provider: this.provider,
        model: env.OPENAI_MODEL,
        operation: input.operation ?? "generate",
        taskId: input.taskId,
        agentSlug: input.agentSlug,
        draftId: input.draftId,
        durationMs: Date.now() - startedAt,
        error: safeErrorMessage(error, "OpenAI request failed")
      });
      throw error;
    }
  }
}

export const aiClient: AiClient = aiProvider === "openai" && env.OPENAI_API_KEY
  ? new OpenAiClient(env.OPENAI_API_KEY)
  : new MockAiClient();
