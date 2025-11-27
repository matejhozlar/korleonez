declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // app
      PORT: number;
      NODE_ENV: "production" | "development" | "test";
      // minecraft
      MC_SERVER_IP: string;
      MC_SERVER_PORT: string;
      MC_QUERY_PORT: string;
      MC_SERVER_NAME: string;
      // discord
      DISCORD_BOT_TOKEN: string;
      DISCORD_BOT_ID: string;
      DISCORD_GUILD_ID: string;
    }
  }
}

export {};
