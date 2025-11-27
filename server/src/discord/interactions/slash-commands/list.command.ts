import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { MinecraftStatusManager } from "@/services/minecraft-status/minecraft-status.service";

/**
 * Slash command configuration for the /list command
 * Displays current Minecraft server status and online players
 */
export const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription(
    `Shows the list of players currently online on ${process.env.MC_SERVER_NAME} server`
  );

/**
 * Whether this commad should only be available in production environment
 */
export const prodOnly = false;

/**
 * Execute the /list command to display Minecraft server status and player list
 *
 * Creates a Discord embed showing:
 * - Server online/offline status
 * - Current player count vs max players
 * - Server version
 * - List of online players (if available)
 *
 * @param interaction - The Discord slash command interaction
 * @returns Promise resolving when the reply has been sent
 *
 * @example
 * // When server is online with players:
 * // Shows green embed with status, player count, version, and player names
 *
 * @example
 * // When server is offline:
 * // Shows red embed with offline message
 */
export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const statusManager = MinecraftStatusManager.getInstance();
  const status = statusManager.getStatus();

  if (!status) {
    await interaction.editReply({
      content: "Unable to fetch server status. Please try again later.",
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Minecraft server status")
    .setColor(status.online ? 0x00ff00 : 0xff0000)
    .setTimestamp(status.lastUpdated);

  if (!status.online) {
    embed.setDescription("❌ **Server is currently offline**");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  embed.addFields(
    {
      name: "Status",
      value: "🟢 Online",
      inline: true,
    },
    {
      name: "Players",
      value: `${status.playerCount}/${status.maxPlayers}`,
      inline: true,
    },
    {
      name: "Version",
      value: status.version,
      inline: true,
    }
  );

  if (status.players.length > 0) {
    const playerList = status.players.map((p) => `• ${p.name}`).join("\n");
    embed.addFields({
      name: `Online Players (${status.players.length})`,
      value:
        playerList.length > 1024
          ? playerList.substring(0, 1021) + "..."
          : playerList,
      inline: false,
    });
  } else if (status.playerCount > 0) {
    embed.addFields({
      name: "Players Online",
      value: `${status.playerCount} player(s) online\n*Player names not available*`,
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Players Online",
      value: "No players currently online",
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
