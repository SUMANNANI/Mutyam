import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

const movies = [
  {
    title: "Baahubali",
    language: "Telugu",
    genre: "Action, Drama",
    plot: "A young man discovers his royal heritage and challenges a ruthless king.",
    reward: 1000,
  },
  {
    title: "RRR",
    language: "Telugu",
    genre: "Action, Drama",
    plot: "Two revolutionaries become friends before fighting for freedom.",
    reward: 1000,
  },
  {
    title: "Interstellar",
    language: "English",
    genre: "Sci-Fi",
    plot: "Explorers travel through space to save humanity.",
    reward: 1000,
  },
  {
    title: "The Dark Knight",
    language: "English",
    genre: "Action",
    plot: "Batman faces his greatest enemy, the Joker.",
    reward: 1000,
  },
];

export default {
  data: new SlashCommandBuilder()
    .setName("movie")
    .setDescription("🎬 Guess today's movie and earn points!"),

  category: "Fun",

  async execute(interaction) {
    await InteractionHelper.safeDefer(interaction);

    const movie =
      movies[Math.floor(Math.random() * movies.length)];

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎬 Daily Movie Guess")
      .setDescription(
        "Guess today's movie using the hints below!"
      )
      .addFields(
        {
          name: "🎭 Genre",
          value: movie.genre,
          inline: true,
        },
        {
          name: "🌐 Language",
          value: movie.language,
          inline: true,
        },
        {
          name: "📝 Plot",
          value: movie.plot,
        },
        {
          name: "💰 Reward",
          value: "🥇 First: **1000** Coins\n🥈 Others: **200-600** Coins",
        }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("movie_guess")
        .setLabel("Make a Guess")
        .setEmoji("🎯")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("movie_leaderboard")
        .setLabel("Leaderboard")
        .setEmoji("🏆")
        .setStyle(ButtonStyle.Secondary)
    );

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [embed],
      components: [row],
    });
  },
};