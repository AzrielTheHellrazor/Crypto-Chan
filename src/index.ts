import { OpenAI } from "openai";
import { TwitterApi } from "twitter-api-v2";

import { config } from "./config";
import { postTweet } from "./post";
import { MentionReplier } from "./reply";

function createClients() {
  const openai = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  const twitter = new TwitterApi({
    appKey: config.twitter.appKey,
    appSecret: config.twitter.appSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessSecret,
  }).readWrite;

  return { openai, twitter };
}

async function main(): Promise<void> {
  const { openai, twitter } = createClients();
  const replier = new MentionReplier(openai, twitter, config.botUserId);

  const postLoop = async () => {
    try {
      await postTweet(openai, twitter);
    } catch (error) {
      console.error("⚠️ Failed to post tweet:", error);
    }
  };

  const mentionLoop = async () => {
    try {
      await replier.handleMentions();
    } catch (error) {
      console.error("⚠️ Failed to process mentions:", error);
    }
  };

  console.log("🚀 Crypto-chan agent starting up…");

  await postLoop();
  await mentionLoop();

  setInterval(() => {
    void postLoop();
  }, config.intervals.postMs);

  setInterval(() => {
    void mentionLoop();
  }, config.intervals.mentionMs);
}

main().catch((error) => {
  console.error("❌ Agent crashed during startup:", error);
  process.exit(1);
});

