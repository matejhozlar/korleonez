import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { validateEnv } from "./utils/env/env-validate";
validateEnv();

import http from "node:http";
import { createApp } from "./app";
import loggerInstance from "./logger";
import { shutdownBot } from "./discord/utils/shut-down";
import bot from "./discord/bot";

global.logger = loggerInstance;

const PORT = process.env.PORT;

const app = createApp();

const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down...");

  try {
    await shutdownBot(bot);

    httpServer.close(() => {
      logger.info("Server closed. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
});
