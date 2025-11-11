import { OpenAI } from "openai";
import type { TweetV2PostTweetResult, TwitterApiReadWrite } from "twitter-api-v2";

import { config } from "./config";
import { buildTweetPrompt, cryptoChanSystemPrompt } from "./agent";

function enforceTweetLength(text: string, maxLength = 250): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateTweet(openai: OpenAI): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 1,
    messages: [
      { role: "system", content: cryptoChanSystemPrompt },
      { role: "user", content: buildTweetPrompt() },
    ],
  });

  const tweet =
    completion.choices[0]?.message?.content?.trim() ??
    "gm frens 💙 ready to degen together?";

  return enforceTweetLength(tweet);
}

export async function postTweet(
  openai: OpenAI,
  twitterClient: TwitterApiReadWrite,
): Promise<TweetV2PostTweetResult> {
  const tweetText = await generateTweet(openai);
  const postedTweet = await twitterClient.v2.tweet(tweetText);

  console.log("🩵 CryptoChan tweeted:", tweetText);

  return postedTweet;
}

