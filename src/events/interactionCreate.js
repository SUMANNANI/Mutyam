import { loadState, saveState, runNewRound } from "../services/dailyGuess.js";
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from "discord.js";

async function refreshEmbed(client) {
  if (!global.dailyGuess || !global.dailyGuess.messageId) return;
  try {
    const channel = await client.channels.fetch("1535220828457668640").catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(global.dailyGuess.messageId).catch(() => null);
    if (!msg) return;

    const state = global.dailyGuess;
    const firstWinnerStr = state.firstWinner
      ? `<@${state.firstWinner}> at <t:${state.firstWinnerTimestamp}:t> (<t:${state.firstWinnerTimestamp}:R>)`
      : "Waiting for the first correct answer";

    let hintText = `No hints yet. First hint <t:${state.hint1Unix}:R>.`;
    if (state.stage === 2) {
      hintText = `**1.** Genre: **${state.movie.genre}**\n**Plot (first half):** ${state.movie.plot1}\n\n*Second hint <t:${state.hint2Unix}:R>.*`;
    } else if (state.stage === 3) {
      hintText = `**1.** Genre: **${state.movie.genre}**\n**Plot (first half):** ${state.movie.plot1}\n**2.** Released: **${state.movie.released}** | Runtime: **${state.movie.runtime}**\n**Plot (second half):** ${state.movie.plot2}`;
    }

    const updatedDescription = 
      `Identify today's **movie** from the hidden artwork. Submit privately; the answer stays hidden until tomorrow's round.\n\n` +
      `**Reward**\n` +
      `First correct answer: **1,000 points**\n` +
      `Later correct answers: **200-600 points**, decreasing with time\n\n` +
      `**Round progress**\n` +
      `People tried: **${state.tried.size}**\n` +
      `Correct guesses: **${state.correct.size}**\n` +
      `First correct: ${firstWinnerStr}\n\n` +
      `**Hints**\n` +
      `${hintText}`;

    const embed = EmbedBuilder.from(msg.embeds[0]).setDescription(updatedDescription);
    await msg.edit({ embeds: [embed] });
  } catch (err) {
    console.error("Error updating live embed counts:", err);
  }
}

export default {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      let hasState = loadState();

      if (interaction.isChatInputCommand() && (interaction.commandName === "movie" || interaction.commandName === "guess")) {
        if (!hasState || !global.dailyGuess || !global.dailyGuess.movie) {
          await interaction.deferReply({ ephemeral: true });
          await runNewRound(client);
          hasState = loadState();
        }

        const modal = new ModalBuilder()
          .setCustomId("modal_guess_submit")
          .setTitle(`Daily Guess #${global.dailyGuess?.round || 1}`);

        const guessInput = new TextInputBuilder()
          .setCustomId("input_movie_title")
          .setLabel("Enter the Movie Title")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. Inception")
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(guessInput);
        modal.addComponents(actionRow);

        if (interaction.deferred) {
          return await interaction.deleteReply().then(() => interaction.showModal(modal));
        } else {
          return await interaction.showModal(modal);
        }
      }

      if (interaction.isButton()) {
        if (interaction.customId === "btn_make_guess") {
          if (!hasState || !global.dailyGuess || !global.dailyGuess.movie) {
            await runNewRound(client);
            hasState = loadState();
          }

          const modal = new ModalBuilder()
            .setCustomId("modal_guess_submit")
            .setTitle(`Daily Guess #${global.dailyGuess?.round || 1}`);

          const guessInput = new TextInputBuilder()
            .setCustomId("input_movie_title")
            .setLabel("Enter the Movie Title")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g. Inception")
            .setRequired(true);

          const actionRow = new ActionRowBuilder().addComponents(guessInput);
          modal.addComponents(actionRow);

          return await interaction.showModal(modal);
        }

        if (interaction.customId === "btn_leaderboard") {
          return await interaction.reply({
            content: "🏆 **Weekly Leaderboard**\nRankings update automatically every Monday!",
            ephemeral: true
          });
        }
      }

      if (interaction.isModalSubmit() && interaction.customId === "modal_guess_submit") {
        if (!global.dailyGuess || !global.dailyGuess.movie) {
          return await interaction.reply({ content: "The current round has ended!", ephemeral: true });
        }

        const userGuess = interaction.fields.getTextInputValue("input_movie_title").trim().toLowerCase();
        const actualTitle = global.dailyGuess.movie.title.toLowerCase();
        const userId = interaction.user.id;

        global.dailyGuess.tried.add(userId);

        if (userGuess === actualTitle) {
          if (global.dailyGuess.correct.has(userId)) {
            return await interaction.reply({
              content: "You have already submitted the correct guess for today!",
              ephemeral: true
            });
          }

          global.dailyGuess.correct.add(userId);

          if (!global.dailyGuess.firstWinner) {
            global.dailyGuess.firstWinner = userId;
            global.dailyGuess.firstWinnerTimestamp = Math.floor(Date.now() / 1000);
          }

          saveState();
          await refreshEmbed(client);

          return await interaction.reply({
            content: "🎉 **Correct!** Your guess has been registered privately.",
            ephemeral: true
          });
        } else {
          saveState();
          await refreshEmbed(client);

          return await interaction.reply({
            content: "❌ **Incorrect guess!** Try again or wait for the next hint.",
            ephemeral: true
          });
        }
      }
    } catch (err) {
      console.error("Interaction execution error:", err);
    }
  }
};
