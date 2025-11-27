import { status } from "minecraft-server-util";
import type { Client } from "discord.js";
import { ActivityType } from "discord.js";

interface MinecraftPlayer {
  name: string;
  uuid: string;
}

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
 * Manages periodic monitoring of Minecraft server status and updates Discord bot presence accordingly
 * Implements singleton pattern to ensure only one instance monitors the server
 */
export class MinecraftStatusManager {
  private static instance: MinecraftStatusManager;
  private currentStatus: MinecraftStatus | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private discordClient: Client | null = null;

  private constructor(
    private readonly host: string,
    private readonly port: number = 25565,
    private readonly queryPort: number = 25565,
    private readonly updateIntervalMs: number = 30000
  ) {}

  /**
   * Get or create the singleton instance of MinecraftStatusManager
   * @param host - The Minecraft server hostname or IP Address
   * @param port - The Minecraft server port for extended server information
   * @param queryPort - The query port for extended server information
   * @param updateIntervalMs - How often to poll the server in milliseconds (default: 30000)
   * @returns The singleton MinecraftStatusManager instance
   * @throws {Error} If host is not provided on first instatiation
   */
  public static getInstance(
    host?: string,
    port?: number,
    queryPort?: number,
    updateIntervalMs?: number
  ): MinecraftStatusManager {
    if (!MinecraftStatusManager.instance) {
      if (!host) {
        throw new Error("Host must be provided when creating instance");
      }
      MinecraftStatusManager.instance = new MinecraftStatusManager(
        host,
        port,
        queryPort,
        updateIntervalMs
      );
    }
    return MinecraftStatusManager.instance;
  }

  /**
   * Start monitoring the Minecraft server and updating Discord bot status
   * @param discordClient - The discord.js client instance to update presence for
   * @returns Promise that resolves when initial status fetch completes
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
   * Stop monitoring the Minecraft server and clear the update interval
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info("Minecraft status monitoring stopped");
    }
  }

  /**
   * Fetch and update server status from the Minecraft Server
   * Updated Discord bot presence if player count changes or server goes offline
   * @private
   * @returns Promise that resolves when status update completes
   */
  private async updateStatus(): Promise<void> {
    try {
      const response = await status(this.host, this.port, {
        timeout: 5000,
        enableSRV: true,
      });

      const previousPlayerCount = this.currentStatus?.playerCount ?? 0;
      const newPlayerCount = response.players.online;

      this.currentStatus = {
        online: true,
        playerCount: newPlayerCount,
        maxPlayers: response.players.max,
        players:
          response.players.sample?.map((p) => ({
            name: p.name,
            uuid: p.id,
          })) ?? [],
        motd: response.motd.clean,
        version: response.version.name,
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
   * Update Discord bot's presence/status to reflect current Minecraft server state
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
   * Get the complete current status of the Minecraft server
   * @returns The current server status or null if no status has been fetched yet
   */
  public getStatus(): MinecraftStatus | null {
    return this.currentStatus;
  }

  /**
   * Get the list of players currently online on the server
   * @returns Array of players currently online (empty array if no status or no players are online)
   */
  public getPlayers(): MinecraftPlayer[] {
    return this.currentStatus?.players ?? [];
  }

  /**
   * Get the current number of players on the server
   * @returns Number of players online (0 if server is offline or no status is available)
   */
  public getPlayerCount(): number {
    return this.currentStatus?.playerCount ?? 0;
  }

  /**
   * Check if the Minecraft server is currently online and reachable
   * @returns True if server is online, false otherwise
   */
  public isOnline(): boolean {
    return this.currentStatus?.online ?? false;
  }

  /**
   * Force an immediate status update outside of the regular interval
   * @returns Promise resolving to the updated server status or null if fetch failed
   */
  public async forceUpdate(): Promise<MinecraftStatus | null> {
    await this.updateStatus();
    return this.currentStatus;
  }
}
