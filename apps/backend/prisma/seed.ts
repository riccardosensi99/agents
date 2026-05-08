import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const agents = [
  {
    name: "InstaSpark",
    slug: "instaspark",
    role: "Social Media Agent per Instagram",
    description:
      "Genera idee post, caption e calendari editoriali per Instagram. Non pubblica senza approvazione.",
    avatarType: "instaspark",
    config: {
      approvalRequired: true,
      platform: "instagram",
      capabilities: ["post_ideas", "captions", "editorial_calendar"],
      publishingEnabled: false
    }
  },
  {
    name: "LinkForge",
    slug: "linkforge",
    role: "LinkedIn Growth Agent",
    description:
      "Genera post LinkedIn, propone commenti e ottimizza il tono professionale. Non pubblica senza approvazione.",
    avatarType: "linkforge",
    config: {
      approvalRequired: true,
      platform: "linkedin",
      capabilities: ["linkedin_posts", "comment_ideas", "tone_optimization"],
      publishingEnabled: false
    }
  },
  {
    name: "Overseer",
    slug: "overseer",
    role: "Supervisor Agent",
    description:
      "Controlla output, qualita, tono e coerenza. Segnala contenuti rischiosi, ripetitivi o troppo generici.",
    avatarType: "overseer",
    config: {
      approvalRequired: false,
      platform: "internal",
      capabilities: ["quality_review", "risk_detection", "revision_feedback"],
      publishingEnabled: false
    }
  }
];

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "Freelance Owner",
      passwordHash
    }
  });

  await prisma.brandProfile.upsert({
    where: { userId: owner.id },
    update: {},
    create: {
      userId: owner.id,
      ownerName: "Freelance Owner",
      bio: "Freelance full-stack developer che aiuta piccole aziende e founder a trasformare idee in prodotti web deployabili.",
      services: "Sviluppo web full-stack, dashboard SaaS, API Node.js, React, database PostgreSQL, Docker, deploy su VPS, integrazioni AI.",
      technicalStack: "React, TypeScript, Node.js, Express, Prisma, PostgreSQL, Docker, Redis, TailwindCSS, OpenAI API.",
      toneOfVoice: "Diretto, pratico, competente, umano. Evita hype, frasi motivazionali vuote e tono corporate finto.",
      targetClients: "Founder, freelance, PMI e team piccoli che hanno bisogno di prodotti web affidabili, automazioni o dashboard operative.",
      businessGoals: "Generare conversazioni con potenziali clienti, mostrare competenza tecnica concreta, posizionarsi come partner affidabile per prodotti full-stack.",
      topicsToPush: "Docker nei progetti reali, deploy affidabili, AI tools usati bene, sviluppo full-stack pragmatico, esempi di workflow freelance.",
      topicsToAvoid: "Promesse di guadagno facile, guru marketing, automation spam, pubblicazione automatica senza controllo umano.",
      goodPostExamples: "Post con problema concreto, soluzione tecnica, mini esempio e CTA soft per aprire una conversazione.",
      bannedWords: "rivoluzionario, game changer, segreto, mindset vincente, guadagno passivo"
    }
  });

  for (const agent of agents) {
    const saved = await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: {
        name: agent.name,
        role: agent.role,
        description: agent.description,
        avatarType: agent.avatarType,
        config: agent.config
      },
      create: {
        ...agent,
        status: "idle"
      }
    });

    const logCount = await prisma.agentLog.count({
      where: { agentId: saved.id }
    });

    if (logCount === 0) {
      await prisma.agentLog.create({
        data: {
          agentId: saved.id,
          message: "Seed agent initialized",
          meta: { slug: saved.slug }
        }
      });
    }
  }

  await prisma.systemEvent.create({
    data: {
      type: "seed.completed",
      message: "Initial AI agent platform seed completed"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
