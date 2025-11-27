declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // app
      PORT: number;
      NODE_ENV: "production" | "development" | "test";
      MC_SERVER_IP: string;
      MC_QUERY_PORT: number;
      // discord
      DISCORD_BOT_TOKEN: string;
      DISCORD_BOT_ID: string;
      DISCORD_GUILD_ID: string;
    }
  }
}

export {};
