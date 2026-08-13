import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const ANNOUNCEMENT_CHANNEL_ID = "1532045232173223997"; 

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
  if (!channel) {
    console.error("Channel not found!");
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setTitle("🎉 New Feature: Daily Movie Guess Game! 🎬")
    .setDescription(
      `We've added an all-new **Daily Movie Guess Game** to the server!\n\n` +
      `Test your cinema knowledge every day, guess hidden movie posters, climb the leaderboard, and earn exclusive points!\n\n` +
      `**✨ How to Play:**\n` +
      `• Head over to <#1535220828457668640> every morning at **8:00 AM IST**.\n` +
      `• Click the **🔍 Make a Guess** button to submit your answer privately.\n` +
      `• Hints unlock automatically throughout the day!\n` +
      `• Check your rankings anytime using the **🏆 Weekly Leaderboard** button.\n\n` +
      `**🎁 Rewards & Points:**\n` +
      `• **First Correct Answer:** 1,000 Points\n` +
      `• **Later Correct Answers:** 200–600 Points\n` +
      `• Weekly top rankers receive **Bonus XP** every Monday!`
    )
    .setImage("https://media.giphy.com/media/l3vR1E6aAAGxS12lA/giphy.gif")
    .setColor("#5865F2")
    .setFooter({ text: "Mutyam Bot Updates • Happy Guessing!", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Go to Guess Channel")
      .setStyle(ButtonStyle.Link)
      .setURL("https://discord.com/channels/1532052700211183678/1535220828457668640")
      .setEmoji("🎬")
  );

  try {
    await channel.send({ content: "@everyone", embeds: [embed], components: [button] });
    console.log("Successfully posted the announcement with @everyone!");
  } catch (err) {
    console.error("Failed to send announcement:", err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
