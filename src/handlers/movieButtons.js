import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";

export const movieGuessButton = {
  name: "movie_guess",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("movie_guess_modal")
      .setTitle("🎬 Guess the Movie");

    const answerInput = new TextInputBuilder()
      .setCustomId("movie_answer")
      .setLabel("What's your guess?")
      .setPlaceholder("Example: Baahubali")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(answerInput)
    );

    await interaction.showModal(modal);
  },
};

export const movieLeaderboardButton = {
  name: "movie_leaderboard",

  async execute(interaction) {
    await interaction.reply({
      content: "🏆 Movie leaderboard is coming soon!",
      ephemeral: true,
    });
  },
};

export default [
  movieGuessButton,
  movieLeaderboardButton,
];