import OpenAI from "openai";
import { env } from "../../config/env";

export type AiGenerateInput = {
  system: string;
  prompt: string;
  temperature?: number;
};

export type AiClient = {
  provider: "mock" | "openai";
  generateText(input: AiGenerateInput): Promise<string>;
};

class MockAiClient implements AiClient {
  public readonly provider = "mock" as const;

  async generateText(input: AiGenerateInput) {
    const system = input.system.toLowerCase();

    if (system.includes("supervisor")) {
      return JSON.stringify({
        qualityScore: 8,
        riskLevel: "low",
        feedback:
          "Bozza coerente con un posizionamento da freelance tecnico. Tono chiaro, nessuna promessa rischiosa, buon margine per renderla piu personale.",
        recommendedAction: "approve"
      });
    }

    if (system.includes("linkedin")) {
      return [
        "Docker non e solo comodita: nei progetti freelance riduce attrito tra sviluppo, staging e produzione.",
        "",
        "Quando un cliente mi chiede rapidita, io voglio poter replicare l'ambiente in minuti, non inseguire differenze tra macchine.",
        "",
        "Tre vantaggi pratici:",
        "- onboarding tecnico piu rapido",
        "- deploy piu prevedibili",
        "- debug piu pulito quando il progetto cresce",
        "",
        "Il valore non e il container in se, ma la disciplina operativa che porta nel progetto."
      ].join("\n");
    }

    if (system.includes("instagram")) {
      return [
        "Idea 1: Carousel 'Prima e dopo un setup Docker pulito' con mini checklist per freelance.",
        "Caption: Un ambiente ripetibile vale ore risparmiate quando il progetto passa dal locale alla VPS.",
        "",
        "Idea 2: Reel breve '3 segnali che il tuo progetto web ha bisogno di containerizzazione'.",
        "Caption: Se ogni deploy sembra una scommessa, il problema non e il server: e il processo.",
        "",
        "Idea 3: Post statico 'Stack freelance robusto: React, Node, Prisma, Postgres, Docker'.",
        "Caption: La differenza tra demo e prodotto deployabile sta nei dettagli operativi."
      ].join("\n");
    }

    return `Bozza generata per: ${input.prompt}`;
  }
}

class OpenAiClient implements AiClient {
  public readonly provider = "openai" as const;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(input: AiGenerateInput) {
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: input.temperature ?? 0.4,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() ?? "";
  }
}

export const aiClient: AiClient = env.OPENAI_API_KEY
  ? new OpenAiClient(env.OPENAI_API_KEY)
  : new MockAiClient();
