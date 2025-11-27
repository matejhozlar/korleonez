import type { Client } from "discord.js";

/**
 * Options for gracefully shutting down a Discord bot
 */
interface ShutdownBotOptions {
  notify?: boolean;
  name?: string;
  message?: string;
}

/**
 * Gracefully shuts down a Discord bot and optionally sends a notification
 *
 * Destroys the bot client connection and logs the shutdown process
 * Can optionally send a notification message to a Discord channel before shutting down
 *
 * @param client - The Discord client instance to shut down
 * @param options - Shutdown configuration options
 */
export const shutdownBot = async (client: Client): Promise<void> => {
  logger.info(`Discord bot shutting down...`);

  try {
    await client.destroy();
    logger.info("Discord bot shut down successfully");
  } catch (error) {
    logger.error("Error during Discord bot shutdown:", error);
  }
};
