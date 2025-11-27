export interface LoggerConfig {
  logDir: string;
  keepDays: number;
}

const config = {
  /**
   * Root directory where daily log folders/files are written
   * Relative paths are resolved from the process working directory
   */
  logDir: "logs",
  /**
   * Number of days to retain dated log folders before automatic cleanup
   * Older folders beyoind this threshold may be deleted
   */
  keepDays: 7,
} satisfies LoggerConfig;

export default config;
