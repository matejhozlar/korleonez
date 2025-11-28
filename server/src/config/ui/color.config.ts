import { ColorResolvable } from "discord.js";

export interface ColorConfig {
  GREEN: ColorResolvable;
  RED: ColorResolvable;
}

const config = {
  GREEN: 0x00ff00,
  RED: 0xff0000,
} satisfies ColorConfig;

export default config;
