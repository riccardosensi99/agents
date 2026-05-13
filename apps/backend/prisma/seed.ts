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

const memoryEntries = [
  {
    title: "Local-only project pain",
    content: "Ho perso 2 giorni perche un progetto funzionava solo sul PC del dev. Da allora preferisco setup riproducibili, Docker e README operativi prima di aggiungere feature lucide.",
    type: "MISTAKE" as const,
    tags: ["docker", "deploy", "workflow", "freelance"],
    importance: 5,
    source: "seed-founder"
  },
  {
    title: "Simple deploy beats hype",
    content: "Preferisco stack semplici e deployabili rispetto ad architetture hype. Se un founder non puo avviare, testare e aggiornare il prodotto senza panico, la tecnologia sta lavorando contro il business.",
    type: "OPINION" as const,
    tags: ["stack", "deploy", "founder", "linkedin"],
    importance: 5,
    source: "seed-founder"
  },
  {
    title: "Monitoring is maintenance",
    content: "Molti founder sottovalutano monitoring e manutenzione. Il prodotto non finisce quando va online: log, healthcheck, backup e rollback sono parte del valore consegnato.",
    type: "LESSON" as const,
    tags: ["monitoring", "production", "founder", "linkedin"],
    importance: 5,
    source: "seed-founder"
  },
  {
    title: "Docker saved VPS deploys",
    content: "Docker mi ha salvato piu volte durante deploy VPS: stesso comando per ricostruire, migrare e ripartire. Non elimina i problemi, ma rende le procedure meno fragili.",
    type: "DEPLOY" as const,
    tags: ["docker", "vps", "deploy", "instagram"],
    importance: 4,
    source: "seed-founder"
  },
  {
    title: "Founder dashboard workflow",
    content: "Quando progetto dashboard per piccoli team parto dai workflow ripetuti: chi crea cosa, dove si blocca, quale stato deve essere visibile subito e quale azione deve essere reversibile.",
    type: "WORKFLOW" as const,
    tags: ["dashboard", "workflow", "saas", "linkedin"],
    importance: 4,
    source: "seed-founder"
  },
  {
    title: "AI needs approval guardrails",
    content: "Uso agenti AI per accelerare bozze e controlli, ma non per pubblicare automaticamente. L'approvazione umana resta il confine tra automazione utile e automation spam.",
    type: "OPINION" as const,
    tags: ["ai", "guardrails", "approval", "instagram", "linkedin"],
    importance: 5,
    source: "seed-founder"
  },
  {
    title: "Practical content formula",
    content: "I contenuti migliori partono da un problema reale, mostrano una scelta tecnica concreta, spiegano il tradeoff e chiudono con una CTA soft. Niente guru tone.",
    type: "CONTENT_EXAMPLE" as const,
    tags: ["content", "instagram", "linkedin", "tone"],
    importance: 5,
    source: "seed-founder"
  },
  {
    title: "Small client case",
    content: "Un cliente piccolo non aveva bisogno di microservizi: aveva bisogno di login, ruoli chiari, CRUD affidabile, backup e una dashboard veloce per decidere ogni mattina.",
    type: "CLIENT_CASE" as const,
    tags: ["client-case", "dashboard", "simplicity", "linkedin"],
    importance: 4,
    source: "seed-founder"
  },
  {
    title: "TypeScript as delivery tool",
    content: "TypeScript non e burocrazia se usato bene: mi aiuta a cambiare codice con meno paura, soprattutto quando backend e frontend condividono concetti di dominio.",
    type: "STACK" as const,
    tags: ["typescript", "stack", "frontend", "backend"],
    importance: 3,
    source: "seed-founder"
  },
  {
    title: "Rollback before launch",
    content: "Prima di mettere online una feature mi chiedo sempre come torno indietro. Un rollback semplice vale piu di un deploy elegante ma fragile.",
    type: "LESSON" as const,
    tags: ["rollback", "deploy", "production"],
    importance: 4,
    source: "seed-founder"
  },
  {
    title: "Freelance communication",
    content: "Con i clienti preferisco mostrare stato, rischi e prossime azioni in modo asciutto. La chiarezza riduce ansia e revisioni inutili piu di qualsiasi promessa.",
    type: "EXPERIENCE" as const,
    tags: ["freelance", "client", "communication", "linkedin"],
    importance: 4,
    source: "seed-founder"
  },
  {
    title: "VPS is enough for many products",
    content: "Per molti MVP e tool interni una VPS ben configurata e piu che sufficiente. Il punto e sapere quando basta e quando invece servono servizi gestiti.",
    type: "OPINION" as const,
    tags: ["vps", "production", "mvp", "stack"],
    importance: 3,
    source: "seed-founder"
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

  for (const memory of memoryEntries) {
    const existing = await prisma.memoryEntry.findFirst({
      where: {
        title: memory.title,
        source: memory.source
      }
    });

    if (existing) {
      await prisma.memoryEntry.update({
        where: { id: existing.id },
        data: memory
      });
    } else {
      await prisma.memoryEntry.create({
        data: memory
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
