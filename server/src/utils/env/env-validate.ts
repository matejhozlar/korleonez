import dotenv from "dotenv";
import REQUIRED_VARS, { type RequiredVar } from "./vars/required-vars";

dotenv.config({ quiet: true });
/**
 * Validates that all required environment variables are set.
 *
 * Environment variables are defined in `REQUIRED_VARS` and must be loaded before calling this function.
 * Logs an error and exits the process if any required variable is missing.
 */
export function validateEnv(
  env: Partial<Record<RequiredVar, string | undefined>> = process.env as Record<
    string,
    string | undefined
  >
): void {
  let hasError = false;

  for (const key of REQUIRED_VARS) {
    const value = env[key];
    if (value === undefined || value === "") {
      logger.error(`Missing required env variable: ${key}`);
      hasError = true;
    }
  }

  if (hasError) {
    logger.error("Environment validation failed. Exiting");
    process.exit(1);
  } else {
    logger.info("All required environment variables are set");
  }
}
