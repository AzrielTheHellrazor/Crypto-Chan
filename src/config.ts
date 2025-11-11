import { config as loadEnv } from "dotenv";

loadEnv();

const REQUIRED_KEYS = [
  "OPENAI_API_KEY",
  "TWITTER_APP_KEY",
  "TWITTER_APP_SECRET",
  "TWITTER_ACCESS_TOKEN",
  "TWITTER_ACCESS_SECRET",
  "TWITTER_BOT_USER_ID",
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

const DEFAULTS = {
  openAiModel: "gpt-5-nano",
  postIntervalMs: 1000 * 60 * 60 * 12, // 12 hours
  mentionIntervalMs: 1000 * 60 * 10, // 10 minutes
} as const;

function requireEnv(key: RequiredKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is missing`);
  }

  return value;
}

function parseInterval(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(
      `[config] Invalid interval value "${value}", using fallback ${fallback}ms`,
    );
    return fallback;
  }

  return parsed;
}

export const config = {
  openai: {
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL ?? DEFAULTS.openAiModel,
  },
  twitter: {
    appKey: requireEnv("TWITTER_APP_KEY"),
    appSecret: requireEnv("TWITTER_APP_SECRET"),
    accessToken: requireEnv("TWITTER_ACCESS_TOKEN"),
    accessSecret: requireEnv("TWITTER_ACCESS_SECRET"),
  },
  botUserId: requireEnv("TWITTER_BOT_USER_ID"),
  intervals: {
    postMs: parseInterval(process.env.POST_INTERVAL_MS, DEFAULTS.postIntervalMs),
    mentionMs: parseInterval(
      process.env.MENTION_INTERVAL_MS,
      DEFAULTS.mentionIntervalMs,
    ),
  },
} as const;

export type AppConfig = typeof config;

