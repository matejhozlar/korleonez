import { Client, GatewayIntentBits } from "discord.js";

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

bot.once("clientReady", async () => {
  if (!bot.user) {
    logger.error("Discord bot user is not initialized");
    return;
  }

  logger.info("Discord bot logged in as", bot.user.tag);
});

bot.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  logger.error("Failed to login Discord bot:", error);
  process.exit(1);
});

export default bot;
