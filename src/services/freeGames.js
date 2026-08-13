import fetch from "node-fetch";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

// Cache to keep track of posted free games so we don't post duplicates
const postedGamesCache = new Set();

/**
 * Initializes the Free Games Notifier service
 * @param {Client} client - Discord Client
 * @param {string} targetChannelId - Target Channel ID for free games
 */
export function initFreeGamesNotifier(client, targetChannelId) {
  console.log("🎁 Free Games Notifier initialized!");

  // Check immediately on bot boot
  checkFreeGames(client, targetChannelId);

  // Check every 1 hour (3,600,000 milliseconds)
  setInterval(() => {
    checkFreeGames(client, targetChannelId);
  }, 3600000);
}

async function checkFreeGames(client, targetChannelId) {
  try {
    // Fetch 100% discount free games (worth claiming permanently or temporarily)
    const res = await fetch("https://www.gamerpower.com/api/giveaways?type=game&sort-by=date");
    if (!res.ok) return;

    const giveaways = await res.json();
    if (!Array.isArray(giveaways)) return;

    const channel = await client.channels.fetch(targetChannelId).catch(() => null);
    if (!channel) return;

    // Filter for popular platforms (Epic Games, Steam, GOG, Ubisoft)
    const activeGames = giveaways.slice(0, 10); // Check latest 10 items

    for (const game of activeGames) {
      const cacheKey = `game_${game.id}`;

      // Skip if already posted
      if (postedGamesCache.has(cacheKey)) continue;

      // Mark as posted
      postedGamesCache.add(cacheKey);

      const embed = new EmbedBuilder()
        .setTitle(`🎁 Free Game! - ${game.title}`)
        .setURL(game.open_giveaway_url)
        .setDescription(game.description || "Claim this game for free right now!")
        .addFields(
          { name: "Worth", value: `~~${game.worth}~~ **FREE**`, inline: true },
          { name: "Platform", value: game.platforms || "PC", inline: true },
          { name: "End Date", value: game.end_date !== "N/A" ? game.end_date : "Limited Time", inline: true }
        )
        .setImage(game.image)
        .setColor("#00FF88")
        .setFooter({ text: `Source: GamerPower • ${game.type}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Open in Browser")
          .setStyle(ButtonStyle.Link)
          .setURL(game.open_giveaway_url)
      );

      await channel.send({
        content: `🚨 **@everyone Free Game Alert!**`,
        embeds: [embed],
        components: [row]
      });
    }
  } catch (err) {
    console.error("Free Games Fetch Error:", err.message);
  }
}