import type { Client } from "discord.js";
import { ActivityType } from "discord.js";

/**
 * Presents a player currently on the Minecraft server
 */
interface MinecraftPlayer {
  name: string;
  uuid: string;
}
/**
 * Reperesents the current status of Minecraft server
 */
interface MinecraftStatus {
  online: boolean;
  playerCount: number;
  maxPlayers: number;
  players: MinecraftPlayer[];
  motd: string;
  version: string;
  lastUpdated: Date;
}
/**
 * Response structure from mcstatus.io API
 * @internal
 */
interface McStatusResponse {
  online: boolean;
  host: string;
  port: number;
  players?: {
    online: number;
    max: number;
    list?: Array<{
      name_clean: string;
      uuid: string;
    }>;
  };
  version?: {
    name_clean: string;
  };
  motd?: {
    clean: string;
  };
}
/**
 * Manages periodic polling of a Minecraft server's status and updates Discord bot presence accordingly
 * Implements the singleton pattern to ensure only one instance monitors a server at a time
 */
export class MinecraftStatusManager {
  private static instance: MinecraftStatusManager;
  private currentStatus: MinecraftStatus | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private discordClient: Client | null = null;

  private constructor(
    private readonly host: string,
    private readonly port: number = 25565,
    private readonly updateIntervalMs: number = 30000
  ) {}
  /**
   * Creates a new MinecraftStatusManager instance
   * Private constructor to enforce singleton pattern
   *
   * @param host - The Minecraft server hostname or IP Address
   * @param port - The Minecraft server port (default: 25565)
   * @param updateIntervalMs - How often to poll the server status (default: 30000)
   * @returns The singleton instance
   * @throws {Error} If host is not provided when creating the instance for the first time
   */
  public static getInstance(
    host?: string,
    port?: number,
    updateIntervalMs?: number
  ): MinecraftStatusManager {
    if (!MinecraftStatusManager.instance) {
      if (!host) {
        throw new Error("Host must be provided when creating instance");
      }
      MinecraftStatusManager.instance = new MinecraftStatusManager(
        host,
        port,
        updateIntervalMs
      );
    }
    return MinecraftStatusManager.instance;
  }
  /**
   * Starts monitoring the Minecraft server status and updating Discord presence
   * Performs an immediate status check, then continues polling at the configured interval
   *
   * @param discordClient - The discord.js Client to update presence for
   * @returns Promise resolving when the initial status checks is completed
   */
  public async start(discordClient: Client): Promise<void> {
    if (this.updateInterval) {
      logger.warn("MinecraftStatusManager is already running");
      return;
    }

    if (discordClient) {
      this.discordClient = discordClient;
    }

    logger.info(
      `Starting Minecraft status monitoring for ${this.host}:${this.port}`
    );

    await this.updateStatus();

    this.updateInterval = setInterval(async () => {
      await this.updateStatus();
    }, this.updateIntervalMs);
  }
  /**
   * Stops monitoring the Minecraft server status and clears the update interval
   * Does not clear the cached status information
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info("Minecraft status monitoring stopped");
    }
  }
  /**
   * Fetches the current server status from mcstatus.io API and updates internal state
   * Automatically updates Discord presence if the player count changes
   * If the server is unreachable, marks it as offline while preserving previous data
   *
   * @private
   */
  private async updateStatus(): Promise<void> {
    try {
      const apiUrl = `https://api.mcstatus.io/v2/status/java/${this.host}:${this.port}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: McStatusResponse = await response.json();

      if (!data.online) {
        throw new Error("Server reported as offline");
      }

      const previousPlayerCount = this.currentStatus?.playerCount;
      const newPlayerCount = data.players?.online ?? 0;

      this.currentStatus = {
        online: true,
        playerCount: newPlayerCount,
        maxPlayers: data.players?.max ?? 0,
        players:
          data.players?.list?.map((p) => ({
            name: p.name_clean,
            uuid: p.uuid,
          })) ?? [],
        motd: data.motd?.clean ?? "",
        version: data.version?.name_clean ?? "Unknown",
        lastUpdated: new Date(),
      };

      if (previousPlayerCount !== newPlayerCount && this.discordClient) {
        this.updateDiscordStatus();
      }

      logger.debug(
        `MC Status updated: ${newPlayerCount}/${this.currentStatus.maxPlayers} players online`
      );
    } catch (error) {
      logger.error("Failed to fetch Minecraft server status:", error);

      if (this.currentStatus) {
        this.currentStatus.online = false;
        this.currentStatus.lastUpdated = new Date();
      } else {
        this.currentStatus = {
          online: false,
          playerCount: 0,
          maxPlayers: 0,
          players: [],
          motd: "",
          version: "",
          lastUpdated: new Date(),
        };
      }

      if (this.discordClient) {
        this.updateDiscordStatus();
      }
    }
  }
  /**
   * Updates the Discord bot's presence to reflect the current Minecraft server status
   * Shows player count and online status in the bot's custom status
   *
   * @private
   */
  private updateDiscordStatus(): void {
    if (!this.discordClient?.user || !this.currentStatus) return;

    const statusText = this.currentStatus.online
      ? `Online [${this.currentStatus.playerCount}/${this.currentStatus.maxPlayers}]`
      : "Server Offline";

    this.discordClient.user.setPresence({
      activities: [
        {
          type: ActivityType.Custom,
          name: "custom",
          state: statusText,
        },
      ],
      status: this.currentStatus.online ? "online" : "idle",
      afk: false,
    });
  }
  /**
   * Gets the complete current status of the Minecraft server
   *
   * @returns The current server status, or null if no status has been fetched yet
   */
  public getStatus(): MinecraftStatus | null {
    return this.currentStatus;
  }
  /**
   * Gets the list of players currently on the server
   *
   * @returns An array of player objects, or an empty array if unavailable
   */
  public getPlayers(): MinecraftPlayer[] {
    return this.currentStatus?.players ?? [];
  }
  /**
   * Gets the current number of players on the server
   *
   * @returns The number of online players, 0 if unreachable
   */
  public getPlayerCount(): number {
    return this.currentStatus?.playerCount ?? 0;
  }
  /**
   * Checks if the server is currently online and responsive
   *
   * @returns True if the server is online, false otherwise
   */
  public isOnline(): boolean {
    return this.currentStatus?.online ?? false;
  }
  /**
   * Forces an immediate status update outside of the normal polling interval
   * Useful for on-demand status checks or manual refreshes
   *
   * @returns Promise resolving to the updated server status
   */
  public async forceUpdate(): Promise<MinecraftStatus | null> {
    await this.updateStatus();
    return this.currentStatus;
  }
}
