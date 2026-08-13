import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { loadState } from "../services/dailyGuess.js";

export const data = new SlashCommandBuilder()
  .setName("guess")
  .setDescription("Check the current movie guess round");

export const category = "fun";

export async function execute(interaction) {
  // Always load state from disk first
  loadState();

  if (!global.dailyGuess || !global.dailyGuess.movie) {
    return await interaction.reply({
      content: "No active movie guess game running right now!",
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎬 Daily Guess #${global.dailyGuess.round || 1}`)
    .setDescription("Use the **Make a Guess** button on the posted embed in the guess channel to submit your guess!")
    .setColor("#5865F2");

  return await interaction.reply({ embeds: [embed], ephemeral: true });
}

export default {
  data,
  category,
  execute
};
