export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const config = {
  /**
   * How long to keep requests counts for each client
   */
  windowMs: 15 * 60 * 1000,
  /**
   * How many requests a single client can make within windowMs
   */
  max: 1000,
} satisfies RateLimitConfig;

export default config;
