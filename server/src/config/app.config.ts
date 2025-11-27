export interface AppConfig {
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
  nodeEnv: string;
}

const config = {
  /**
   * Whether the application is running in development mode
   */
  isDev: process.env.NODE_ENV === "development",
  /**
   * Whether the application is running in production mode
   */
  isProd: process.env.NODE_ENV === "production",
  /**
   * Whether the application is running in test mode
   */
  isTest: process.env.NODE_ENV === "test",
  /**
   * Current Node environment
   */
  nodeEnv: process.env.NODE_ENV,
} satisfies AppConfig;

export default config;
