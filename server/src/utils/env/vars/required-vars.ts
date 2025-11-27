export const REQUIRED_VARS = ["DISCORD_BOT_TOKEN", "NODE_ENV", "PORT"] as const;

export type RequiredVar = (typeof REQUIRED_VARS)[number];
export default REQUIRED_VARS;
