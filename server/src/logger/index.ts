import path from "node:path";
import fs from "node:fs";
import util from "node:util";
import winston from "winston";
import config from "@/config";

const logDir = config.logger.logDir;
const SPLAT = Symbol.for("splat");

class DailyFolderLogger {
  private currentDate: string;
  private logger: winston.Logger;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.currentDate = this.getDateString();
    this.logger = this.createLoggerForDate(this.currentDate);
    this.monitorDateChange();
  }

  private getDateString(): string {
    const now = new Date();
    return now.toLocaleDateString("sv-SE");
  }

  private getLogPathForDate(date: string, filename: string): string {
    const datedDir = path.join(logDir, date);
    if (!fs.existsSync(datedDir)) {
      fs.mkdirSync(datedDir, { recursive: true });
    }
    return path.join(datedDir, filename);
  }

  private createLoggerForDate(date: string): winston.Logger {
    const baseFormat = winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf((info) => {
        const { timestamp, level, message } =
          info as winston.Logform.TransformableInfo & {
            [SPLAT]?: unknown[];
          };

        const splat: unknown[] = (info as any)[SPLAT] || [];

        const formatted = util.format(
          message,
          ...splat.map((arg) =>
            arg instanceof Error
              ? arg.stack || arg.message
              : typeof arg === "object"
              ? util.inspect(arg, { depth: null, breakLength: 120 })
              : arg
          )
        );

        return `[${timestamp}] [${String(level).toUpperCase()}] ${formatted}`;
      })
    );

    const isDev = process.env.NODE_ENV !== "production";

    return winston.createLogger({
      level: isDev ? "debug" : "info",
      format: baseFormat,
      transports: [
        new winston.transports.File({
          filename: this.getLogPathForDate(date, "server.log"),
          level: "info",
        }),
        new winston.transports.File({
          filename: this.getLogPathForDate(date, "errors.log"),
          level: "error",
        }),
        ...(isDev
          ? [
              new winston.transports.File({
                filename: this.getLogPathForDate(date, "debug.log"),
                level: "debug",
              }),
            ]
          : []),
        new winston.transports.Console({
          level: isDev ? "debug" : "info",
        }),
      ],
      exceptionHandlers: [
        new winston.transports.File({
          filename: this.getLogPathForDate(date, "exceptions.log"),
        }),
      ],
    });
  }

  private cleanOldLogFolders(daysToKeep: number): void {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    fs.readdir(logDir, (error, folders) => {
      if (error) {
        console.error("Failed to read logDir:", error);
        return;
      }

      folders.forEach((folder) => {
        const folderPath = path.join(logDir, folder);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(folder)) return;

        const folderTime = new Date(folder).getTime();
        if (!Number.isNaN(folderTime) && folderTime < cutoff) {
          fs.rm(folderPath, { recursive: true, force: true }, (rmErr) => {
            if (rmErr) {
              console.log(`Failed to delete old log folder ${folder}`, rmErr);
            } else {
              console.log(`Deleted old log folder: ${folder}`);
            }
          });
        }
      });
    });
  }

  private monitorDateChange(): void {
    this.timer = setInterval(() => {
      const newDate = this.getDateString();
      if (newDate !== this.currentDate) {
        this.logger.close();
        this.currentDate = newDate;
        this.logger = this.createLoggerForDate(this.currentDate);
        this.cleanOldLogFolders(config.logger.keepDays);
      }
    }, 60 * 1000);
  }

  public debug(...args: unknown[]): void {
    (this.logger as any).debug(...args);
  }

  public error(...args: unknown[]): void {
    (this.logger as any).error(...args);
  }

  public warn(...args: unknown[]): void {
    (this.logger as any).warn(...args);
  }

  public info(...args: unknown[]): void {
    (this.logger as any).info(...args);
  }

  public log(level: string, ...args: unknown[]): void {
    (this.logger as any).log(level, ...args);
  }

  public close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.close();
  }
}

const loggerInstance = new DailyFolderLogger();
export default loggerInstance;
