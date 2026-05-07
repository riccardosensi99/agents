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

  await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "Freelance Owner",
      passwordHash
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
