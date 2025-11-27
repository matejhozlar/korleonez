import { Client, GatewayIntentBits } from "discord.js";
import { registerInteractionHandler } from "../handlers/interaction-handler";
import { loadCommandHandlers } from "../loaders/command-loader";
import { MinecraftStatusManager } from "@/services/minecraft-status/minecraft-status.service";

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

  const mcStatusManager = MinecraftStatusManager.getInstance(
    process.env.MC_SERVER_IP,
    process.env.MC_SERVER_PORT,
    process.env.MC_QUERY_PORT
  );

  await mcStatusManager.start(bot);

  logger.info("Discord bot logged in as", bot.user.tag);
});

(async () => {
  const commandHandlers = await loadCommandHandlers();
  registerInteractionHandler(bot, commandHandlers);

  await bot.login(process.env.DISCORD_BOT_TOKEN);
})().catch((error) => {
  logger.error("Failed to initialize Discord bot:", error);
  process.exit(1);
});

export default bot;
