import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Collection } from "discord.js";
import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import config from "@/config";

/**
 * Discord command module structure
 */
export interface CommandModule {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  prodOnly?: boolean;
}

/**
 * Loads Discord command handlers from discord/commands folder
 *
 * @returns commandHandlers
 */
export async function loadCommandHandlers(): Promise<
  Collection<string, CommandModule>
> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const commandsPath = path.join(
    __dirname,
    "..",
    "interactions",
    "slash-commands"
  );
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));

  const commandHandlers = new Collection<string, CommandModule>();

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const commandModule = (await import(
        pathToFileURL(filePath).href
      )) as CommandModule;

      const isValid =
        commandModule.data && typeof commandModule.execute === "function";
      const isProdOnly = commandModule.prodOnly === true;

      if (!isValid) {
        logger.warn(`Skipped loading file ${file} - missing data or execute()`);
        continue;
      }

      if (config.app.isDev && isProdOnly) {
        logger.warn(`Skipped production only command: ${file}`);
        continue;
      }

      commandHandlers.set(commandModule.data.name, commandModule);
    } catch (error) {
      logger.error(`Failed to load command ${file}:`, error);
    }
  }

  logger.info(`Loaded ${commandHandlers.size} Discord command(s)`);
  return commandHandlers;
}
