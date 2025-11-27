import {
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.DISCORD_BOT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  new SlashCommandBuilder()
    .setName("list")
    .setDescription(
      `Shows the list of players currently online on ${process.env.MC_SERVER_NAME} server`
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

/**
 * Registers an array of slash commands to a specific Discord guild.
 *
 * @param {string} clientId - The bot application's client ID.
 * @param {string} guildId - The target guild ID to register the commands under.
 * @param {string} token - The bot's authorization token.
 * @param {Array<object>} commands - An array of JSON slash command definitions.
 * @returns {Promise<void>}
 */
(async () => {
  try {
    console.log("📡 Registering slash commands in GUILD:", GUILD_ID);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Commands registered:");
    data.forEach((cmd) => console.log(` - /${cmd.name}`));
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();
