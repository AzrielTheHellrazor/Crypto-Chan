import { OpenAI } from "openai";
import type {
  TweetUserMentionTimelineV2Paginator,
  TweetV2,
  TweetV2PostTweetResult,
  TwitterApiReadWrite,
  UserV2,
} from "twitter-api-v2";

import { config } from "./config";
import { buildReplyPrompt, cryptoChanSystemPrompt } from "./agent";

function mapUsersById(users: UserV2[] | undefined): Map<string, UserV2> {
  return new Map((users ?? []).map((user) => [user.id, user]));
}

function enforceLength(text: string, maxLength = 250): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export class MentionReplier {
  private lastMentionId: string | undefined;

  constructor(
    private readonly openai: OpenAI,
    private readonly twitterClient: TwitterApiReadWrite,
    private readonly botUserId: string,
  ) {}

  async handleMentions(): Promise<void> {
    const mentions = await this.fetchMentions();
    if (!mentions) {
      return;
    }

    const userMap = mapUsersById(mentions.includes?.users);
    const tweets = [...(mentions.tweets ?? [])].reverse();

    for (const tweet of tweets) {
      if (!tweet.author_id || tweet.author_id === this.botUserId) {
        continue;
      }

      await this.replyToMention(tweet, userMap.get(tweet.author_id));
    }

    this.lastMentionId = mentions.meta?.newest_id ?? this.lastMentionId;
  }

  private async fetchMentions(): Promise<
    TweetUserMentionTimelineV2Paginator | null
  > {
    try {
      const timeline = await this.twitterClient.v2.userMentionTimeline(
        this.botUserId,
        {
          since_id: this.lastMentionId,
          expansions: ["author_id"],
          "tweet.fields": ["author_id", "conversation_id", "created_at", "text"],
          max_results: 20,
        },
      );

      if (!timeline.tweets?.length) {
        return null;
      }

      return timeline;
    } catch (error) {
      console.error("⚠️ Failed to fetch mentions:", error);
      return null;
    }
  }

  private async replyToMention(
    tweet: TweetV2,
    author: UserV2 | undefined,
  ): Promise<TweetV2PostTweetResult | void> {
    const authorHandle = author?.username ?? "anon";

    try {
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        temperature: 1,
        messages: [
          { role: "system", content: cryptoChanSystemPrompt },
          {
            role: "user",
            content: buildReplyPrompt(tweet.text ?? "", authorHandle),
          },
        ],
      });

      const replyText =
        completion.choices[0]?.message?.content?.trim() ??
        `gm @${authorHandle} 💙`;

      const finalText = enforceLength(replyText);
      const response = await this.twitterClient.v2.reply(finalText, tweet.id);

      console.log(`💬 Replied to @${authorHandle}: ${finalText}`);

      return response;
    } catch (error) {
      console.error(`⚠️ Failed to reply to @${authorHandle}:`, error);
    }
  }
}

