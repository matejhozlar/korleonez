import type {
  Channel,
  TextChannel,
  NewsChannel,
  PrivateThreadChannel,
  PublicThreadChannel,
  DMChannel,
  VoiceChannel,
} from "discord.js";

/**
 * Type for channels that support sending messages
 */
export type SendableChannel =
  | TextChannel
  | NewsChannel
  | PrivateThreadChannel
  | PublicThreadChannel
  | DMChannel;

/**
 * Type guard to check if a channel supports sending messages
 *
 * @param channel - The channel to check
 * @returns True if the channel has a send method
 */
export function isSendableChannel(
  channel: Channel | null
): channel is SendableChannel {
  return (
    channel !== null && "send" in channel && typeof channel.send === "function"
  );
}

/**
 * Type guard to check if a channel is a text channel
 *
 * @param channel - The channel to check
 * @returns True if the channel is a TextChannel
 */
export function isTextChannel(channel: Channel | null): channel is TextChannel {
  return channel !== null && channel.type === 0;
}

/**
 * Type guard to check if a channel is a voice channel
 *
 * @param channel - The channel to check
 * @returns True if the channel is a VoiceChannel
 */
export function isVoiceChannel(
  channel: Channel | null
): channel is VoiceChannel {
  return channel !== null && channel.type === 2;
}

/**
 * Type guard to check if a channel is a thread
 *
 * @param channel - The channel to check
 * @returns True if the channel is a thread
 */
export function isThreadChannel(
  channel: Channel | null
): channel is PrivateThreadChannel | PublicThreadChannel {
  return channel !== null && channel.isThread();
}

/**
 * Type guard to check if a channel is a DM channel
 *
 * @param channel - The channel to check
 * @returns True if the channel is a DMChannel
 */
export function isDMChannel(channel: Channel | null): channel is DMChannel {
  return channel !== null && channel.isDMBased();
}
