import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { OMDB_API_KEY } from "../../config/omdb.js";

export default {
  data: new SlashCommandBuilder()
    .setName("movie")
    .setDescription("Start the OMDB-powered Daily Guess Game!"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const randomId = "tt3896198";
      const res = await fetch(`https://www.omdbapi.com/?i=${randomId}&apikey=${OMDB_API_KEY}`);
      const data = await res.json();

      global.dailyGuess = {
        round: 1, // Reset starting counter to Day 1
        movie: {
          title: data.Title,
          genre: data.Genre,
          released: data.Year,
          runtime: data.Runtime,
          plot: data.Plot,
          poster: data.Poster,
          blurred_poster: `https://images.weserv.nl/?url=${encodeURIComponent(data.Poster)}&blur=15`
        },
        tried: new Set(),
        correct: new Set(),
        firstWinner: null
      };

      const state = global.dailyGuess;

      const embed = new EmbedBuilder()
        .setTitle(`🎬 Daily Guess #${state.round}`)
        .setDescription(
          `Identify today's **movie** from the hidden artwork. Submit privately; the answer stays hidden until tomorrow's round.\n\n` +
          `**Reward**\n` +
          `First correct answer: **1,000 points**\n` +
          `Later correct answers: **600-1,000 points**, decreasing with time\n\n` +
          `**Round progress**\n` +
          `People tried: **0**\n` +
          `Correct guesses: **0**\n` +
          `First correct: Waiting for the first correct answer\n\n` +
          `**Hints**\n` +
          `No hints yet. First hint in 6 hours.`
        )
        .setImage(state.movie.blurred_poster)
        .setColor("#5865F2")
        .setFooter({ text: "Second hint appears at 8:00 PM IST. Weekly rankings refresh every Monday." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("btn_make_guess").setLabel("Make a Guess").setEmoji("🔍").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("btn_leaderboard").setLabel("Weekly Leaderboard").setEmoji("🏆").setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error("Error running /movie:", error);
      await interaction.editReply({ content: "Failed to initialize movie game!" });
    }
  }
};
