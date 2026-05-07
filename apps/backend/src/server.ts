import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { createApp } from "./app";
import { startScheduler, stopScheduler } from "./scheduler/scheduler";

const app = createApp();

const server = app.listen(env.PORT, () => {
  startScheduler();
  console.log(`Backend listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down`);
  stopScheduler();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
