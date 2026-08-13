import { handleCounting } from "../games/counting.js";
// import { handleXP } from "../games/xpSystem.js"; // Disabled until xpSystem.js is created
import { execute as executeGuess } from "../commands/guess.js";
import { getHelpData } from "../commands/help.js";
import { EmbedBuilder } from "discord.js";

const userBalances = new Map();
const dailyCooldowns = new Map();

export default {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // 1. Level XP Engine (Temporarily Disabled)
    // await handleXP(message);

    // 2. Counting Game Engine
    await handleCounting(message);

    // 3. Text Prefix Commands
    const content = message.content.trim().toLowerCase();

    if (content === "!guess" || content === "!movie") {
      return await executeGuess(message);
    }

    if (content === "!help" || content === "!h") {
      return await message.reply(getHelpData("fun"));
    }

    if (content === "!daily" || content === "!checkin") {
      const userId = message.author.id;
      const now = Date.now();
      const lastClaim = dailyCooldowns.get(userId) || 0;
      const cooldownTime = 24 * 60 * 60 * 1000;

      if (now - lastClaim < cooldownTime) {
        const remainingMs = cooldownTime - (now - lastClaim);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return await message.reply(`⏰ You have already claimed your daily reward! Come back in **${hours}h ${minutes}m**.`);
      }

      const rewardAmount = 100;
      const currentBal = (userBalances.get(userId) || 0) + rewardAmount;
      
      userBalances.set(userId, currentBal);
      dailyCooldowns.set(userId, now);

      const dailyEmbed = new EmbedBuilder()
        .setTitle("Daily Claimed!")
        .setDescription(`You have claimed your daily **$${rewardAmount}**!\n\n**New Cash Balance**\n$${currentBal.toLocaleString()}`)
        .setColor("#2ECC71");

      return await message.reply({ embeds: [dailyEmbed] });
    }
  }
};