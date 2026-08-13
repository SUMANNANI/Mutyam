import fetch from "node-fetch";
import { EmbedBuilder } from "discord.js";

// Global Config
const USERNAME = "aakarimutyam";

// Twitch API Credentials
const TWITCH_CLIENT_ID = "YOUR_TWITCH_CLIENT_ID";
const TWITCH_CLIENT_SECRET = "YOUR_TWITCH_CLIENT_SECRET";
let twitchAccessToken = null;

// YouTube API Credential
const YOUTUBE_API_KEY = "YOUR_YOUTUBE_API_KEY";
const YOUTUBE_CHANNEL_ID = "YOUR_YOUTUBE_CHANNEL_ID"; // e.g. UCxxxxxxxxxxxxxxxxxx

// Independent Cache to track live status per platform
const liveCache = new Set();

/**
 * Initializes the live stream notifier service
 * @param {Client} client - Discord Client
 * @param {string} notificationChannelId - Target Discord Channel ID for announcements
 */
export function initLiveNotifier(client, notificationChannelId) {
  console.log(`📡 Live Stream Notifier initialized for: ${USERNAME}`);

  // Initial check on bot startup
  checkAllPlatforms(client, notificationChannelId);

  // Check every 2 minutes (120,000 ms)
  setInterval(() => {
    checkAllPlatforms(client, notificationChannelId);
  }, 120000);
}

async function checkAllPlatforms(client, channelId) {
  // Runs independently - each platform handles its own post
  checkKick(client, channelId);
  checkTwitch(client, channelId);
  checkYouTube(client, channelId);
  checkTikTok(client, channelId);
}

// ============================================================================
// 1. KICK LIVE CHECKER (No Key Required)
// ============================================================================
async function checkKick(client, channelId) {
  try {
    const res = await fetch(`https://kick.com/api/v1/channels/${USERNAME}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!res.ok) return;
    const data = await res.json();
    const isLive = data?.livestream !== null;
    const cacheKey = `kick_${USERNAME}`;

    if (isLive && !liveCache.has(cacheKey)) {
      liveCache.add(cacheKey);

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`🟢 aakarimutyam is LIVE on Kick!`)
        .setURL(`https://kick.com/${USERNAME}`)
        .setDescription(data.livestream.session_title || "Come hang out in stream!")
        .addFields(
          { name: "Category", value: data.livestream.categories?.[0]?.name || "Just Chatting", inline: true },
          { name: "Viewers", value: `${data.livestream.viewer_count || 0}`, inline: true }
        )
        .setImage(data.livestream.thumbnail?.url || data.user.profile_pic)
        .setColor("#53FC18")
        .setTimestamp();

      await channel.send({
        content: `🚨 **@everyone aakarimutyam is now live on Kick!**\nhttps://kick.com/${USERNAME}`,
        embeds: [embed]
      });

    } else if (!isLive && liveCache.has(cacheKey)) {
      liveCache.delete(cacheKey); // Clear cache when stream ends
    }
  } catch (err) {
    console.error("Kick Live Check Error:", err.message);
  }
}

// ============================================================================
// 2. TWITCH LIVE CHECKER (Requires Twitch Client ID & Secret)
// ============================================================================
async function getTwitchToken() {
  try {
    const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, {
      method: "POST"
    });
    const data = await res.json();
    twitchAccessToken = data.access_token;
  } catch (err) {
    console.error("Twitch Token Error:", err.message);
  }
}

async function checkTwitch(client, channelId) {
  if (TWITCH_CLIENT_ID === "YOUR_TWITCH_CLIENT_ID") return; // Skip if credentials not added yet

  try {
    if (!twitchAccessToken) await getTwitchToken();

    const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${USERNAME}`, {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": `Bearer ${twitchAccessToken}`
      }
    });

    if (res.status === 401) {
      await getTwitchToken();
      return checkTwitch(client, channelId);
    }

    const data = await res.json();
    const isLive = data.data && data.data.length > 0;
    const cacheKey = `twitch_${USERNAME}`;

    if (isLive && !liveCache.has(cacheKey)) {
      liveCache.add(cacheKey);

      const stream = data.data[0];
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`🟣 aakarimutyam is LIVE on Twitch!`)
        .setURL(`https://twitch.tv/${USERNAME}`)
        .setDescription(stream.title || "Come watch the stream live!")
        .addFields(
          { name: "Category", value: stream.game_name || "Just Chatting", inline: true },
          { name: "Viewers", value: `${stream.viewer_count || 0}`, inline: true }
        )
        .setImage(stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720"))
        .setColor("#9146FF")
        .setTimestamp();

      await channel.send({
        content: `🚨 **@everyone aakarimutyam is now live on Twitch!**\nhttps://twitch.tv/${USERNAME}`,
        embeds: [embed]
      });

    } else if (!isLive && liveCache.has(cacheKey)) {
      liveCache.delete(cacheKey);
    }
  } catch (err) {
    console.error("Twitch Live Check Error:", err.message);
  }
}

// ============================================================================
// 3. YOUTUBE LIVE CHECKER (Requires YouTube Data API Key)
// ============================================================================
async function checkYouTube(client, channelId) {
  if (YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY") return; // Skip if key not added yet

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    const isLive = data.items && data.items.length > 0;
    const cacheKey = `youtube_${USERNAME}`;

    if (isLive && !liveCache.has(cacheKey)) {
      liveCache.add(cacheKey);

      const stream = data.items[0];
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`🔴 aakarimutyam is LIVE on YouTube!`)
        .setURL(`https://www.youtube.com/watch?v=${stream.id.videoId}`)
        .setDescription(stream.snippet.title || "Join the YouTube live broadcast!")
        .setImage(stream.snippet.thumbnails?.high?.url)
        .setColor("#FF0000")
        .setTimestamp();

      await channel.send({
        content: `🚨 **@everyone aakarimutyam is now live on YouTube!**\nhttps://www.youtube.com/watch?v=${stream.id.videoId}`,
        embeds: [embed]
      });

    } else if (!isLive && liveCache.has(cacheKey)) {
      liveCache.delete(cacheKey);
    }
  } catch (err) {
    console.error("YouTube Live Check Error:", err.message);
  }
}

// ============================================================================
// 4. TIKTOK LIVE CHECKER (No Key Required)
// ============================================================================
async function checkTikTok(client, channelId) {
  try {
    const res = await fetch(`https://www.tiktok.com/@${USERNAME}/live`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const html = await res.text();
    const isLive = html.includes('"status":2') || html.includes('room_id');
    const cacheKey = `tiktok_${USERNAME}`;

    if (isLive && !liveCache.has(cacheKey)) {
      liveCache.add(cacheKey);

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`🖤 aakarimutyam is LIVE on TikTok!`)
        .setURL(`https://www.tiktok.com/@${USERNAME}/live`)
        .setDescription("Tune in to the TikTok live stream now!")
        .setColor("#00F2FE")
        .setTimestamp();

      await channel.send({
        content: `🚨 **@everyone aakarimutyam is now live on TikTok!**\nhttps://www.tiktok.com/@${USERNAME}/live`,
        embeds: [embed]
      });

    } else if (!isLive && liveCache.has(cacheKey)) {
      liveCache.delete(cacheKey);
    }
  } catch (err) {
    console.error("TikTok Live Check Error:", err.message);
  }
}