import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { MinecraftStatusManager } from "@/services/minecraft-status/minecraft-status.service";
import config from "@/config";

/**
 * Slash command configuration for the /ip command
 * Displays Minecraft server connection information and current status
 */
export const data = new SlashCommandBuilder()
  .setName("ip")
  .setDescription(
    `Get connection details and status for ${process.env.MC_SERVER_NAME} server`
  );

/**
 * Whether this command should only be available in production environment
 */
export const prodOnly = false;

/**
 * Execute the /ip command to display Minecraft server connection information
 *
 * Creates an ephemeral Discord embed showing:
 * - Server IP address and port
 * - Server online/offline status
 * - Current player count vs max players
 * - Server version
 * - Message of the day (MOTD)
 * - Last update timestamp
 *
 * @param interaction - The Discord slash command interaction
 * @returns Promise resolving when the reply has been sent
 *
 * @example
 * // When server is online:
 * // Shows green embed with IP, status, player count, version, and MOTD
 *
 * @example
 * // When status unavailable:
 * // Shows error message
 */
export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const statusManager = MinecraftStatusManager.getInstance();
  const status = statusManager.getStatus();

  if (!status) {
    await interaction.editReply({
      content: "Unable to fetch server status. Please try again later",
    });
    return;
  }

  const serverIp = process.env.MC_SERVER_DOMAIN;
  const serverName = process.env.MC_SERVER_NAME;

  const embed = new EmbedBuilder()
    .setTitle(`${serverName}`)
    .setColor(status.online ? config.ui.color.GREEN : config.ui.color.RED)
    .setTimestamp(status.lastUpdated)
    .setFooter({ text: "Last updated" });

  if (!status.online) {
    embed.addFields({
      name: "Status",
      value: "🔴 Offline",
      inline: true,
    });
    embed.addFields({
      name: "Server Address",
      value: `${serverIp}`,
      inline: false,
    });
    await interaction.editReply({ embeds: [embed] });
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
      value: status.version || "Unknown",
      inline: true,
    }
  );

  embed.addFields({
    name: "Server Address",
    value: `${serverIp}`,
    inline: false,
  });

  if (status.motd && status.motd.trim() !== "") {
    embed.addFields({
      name: "📝 Message of the Day",
      value:
        status.motd.length > 1024
          ? status.motd.substring(0, 1021) + "..."
          : status.motd,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
