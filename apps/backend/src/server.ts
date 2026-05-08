import { env, getSafeStartupConfig } from "./config/env";
import { prisma } from "./db/prisma";
import { createApp } from "./app";
import { startScheduler, stopScheduler } from "./scheduler/scheduler";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.info("backend.startup", getSafeStartupConfig());
  startScheduler();
  console.info("backend.listening", { port: env.PORT });
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
