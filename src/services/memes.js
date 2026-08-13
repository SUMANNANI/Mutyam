import fetch from "node-fetch";
import { EmbedBuilder } from "discord.js";

/**
 * Initializes the automated Meme Poster service
 * @param {Client} client - Discord Client
 * @param {string} targetChannelId - Target Channel ID for memes
 */
export function initMemePoster(client, targetChannelId) {
  console.log("🐸 Meme Poster initialized!");

  // Post a meme immediately on bot startup
  fetchAndPostMeme(client, targetChannelId);

  // Post a new meme every 3 hours (10,800,000 milliseconds)
  // You can change this interval to whatever time you prefer!
  setInterval(() => {
    fetchAndPostMeme(client, targetChannelId);
  }, 10800000);
}

async function fetchAndPostMeme(client, targetChannelId) {
  try {
    // Fetch a random meme from popular subreddits (r/memes, r/dankmemes, etc.)
    const res = await fetch("https://meme-api.com/gimme");
    if (!res.ok) return;

    const data = await res.json();
    if (!data || !data.url) return;

    const channel = await client.channels.fetch(targetChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(data.title || "Random Meme")
      .setURL(data.postLink)
      .setImage(data.url)
      .setColor("#FF4500")
      .setFooter({ text: `👍 ${data.ups} • r/${data.subreddit}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Meme Fetch Error:", err.message);
  }
}