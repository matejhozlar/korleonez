import { MessageFlags } from "discord.js";
import type {
  Client,
  Interaction,
  ChatInputCommandInteraction,
  Collection,
} from "discord.js";
import type { CommandModule } from "../loaders/command-loader";

/**
 * Handles chat command interactions
 *
 * @param interaction - The chat input interaction
 * @param commandHandlers - Handlers for commands
 *
 * @returns Promise resolving when the chat command is handled
 */
async function handleChatCommand(
  interaction: ChatInputCommandInteraction,
  commandHandlers: Collection<string, CommandModule>
): Promise<void> {
  const command = commandHandlers.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown comand received /${interaction.commandName}`);
    return;
  }

  logger.info(
    `${interaction.user.tag} (${interaction.user.id}) ran /${interaction.commandName}`
  );

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);

    const replyMethod =
      interaction.replied || interaction.deferred
        ? interaction.followUp
        : interaction.reply;

    await replyMethod.call(interaction, {
      content: "❌ Command failed.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Registers the main interaction handler for chat commands
 *
 * @param discordClient - The Discord client instance
 * @param commandHandlers - Collection of slash command handlers
 */
export function registerInteractionHandler(
  discordClient: Client,
  commandHandlers: Collection<string, CommandModule>
): void {
  discordClient.on("interactionCreate", async (interation: Interaction) => {
    if (interation.isChatInputCommand()) {
      await handleChatCommand(interation, commandHandlers);
      return;
    }
  });
}
