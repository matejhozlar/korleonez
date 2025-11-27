import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import config from "@/config";

const limiter = rateLimit({
  windowMs: config.api.rateLimit.windowMs,
  max: config.api.rateLimit.max,
});

/**
 * Initializes and configures an Express application
 */
export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(limiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
}
