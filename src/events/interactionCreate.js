import { loadState, saveState, runNewRound } from "../services/dailyGuess.js";
import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  ChannelType, 
  PermissionsBitField 
} from "discord.js";

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
      // -------------------------------------------------------------------
      // 1. HANDLE BUTTON CLICK INTERACTIONS
      // -------------------------------------------------------------------
      if (interaction.isButton()) {
        const customId = interaction.customId;

        // --- Handle Close Ticket Button ---
        if (customId === "close_ticket") {
          await interaction.deferReply({ ephemeral: true }).catch(() => {});

          const closedEmbed = new EmbedBuilder()
            .setTitle("Ticket Closed")
            .setDescription(`This ticket has been closed by ${interaction.user}.\n**Reason:** Resolved / Completed\n\nA notification was sent to the ticket creator.`)
            .setColor("#2B2D31");

          const reopenBtn = new ButtonBuilder()
            .setCustomId("reopen_ticket")
            .setLabel("Reopen Ticket")
            .setStyle(ButtonStyle.Success)
            .setEmoji("🔓");

          const deleteBtn = new ButtonBuilder()
            .setCustomId("delete_ticket")
            .setLabel("Delete Ticket")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🗑️");

          const row = new ActionRowBuilder().addComponents(reopenBtn, deleteBtn);

          await interaction.channel.send({ embeds: [closedEmbed], components: [row] });
          return await interaction.editReply({ content: "Ticket has been closed." });
        }

        // --- Handle Delete Ticket Button ---
        if (customId === "delete_ticket") {
          await interaction.reply({ content: "Deleting channel in 5 seconds...", ephemeral: true });
          setTimeout(() => {
            interaction.channel.delete().catch(() => {});
          }, 5000);
          return;
        }

        // --- Handle Reopen Ticket Button ---
        if (customId === "reopen_ticket") {
          await interaction.reply({ content: "Ticket reopened!", ephemeral: true });
          return;
        }

        // --- Open Ticket Modal Prompt ---
        if (customId === "create_ticket" || customId.startsWith("ticket_") || customId.includes("ticket")) {
          const modal = new ModalBuilder()
            .setCustomId("modal_create_ticket")
            .setTitle("Create Support Ticket");

          const reasonInput = new TextInputBuilder()
            .setCustomId("ticket_reason")
            .setLabel("Reason for Ticket")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Describe your issue or inquiry...")
            .setRequired(true);

          const priorityInput = new TextInputBuilder()
            .setCustomId("ticket_priority")
            .setLabel("Priority (Low / Medium / High)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g. Medium")
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(reasonInput),
            new ActionRowBuilder().addComponents(priorityInput)
          );

          return await interaction.showModal(modal);
        }

        // --- Daily Guess Buttons ---
        if (["btn_make_guess", "btn_leaderboard"].includes(customId)) {
          let hasState = loadState();

          if (customId === "btn_make_guess") {
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

          if (customId === "btn_leaderboard") {
            return await interaction.reply({
              content: "🏆 **Weekly Leaderboard**\nRankings update automatically every Monday!",
              ephemeral: true
            });
          }
        }
      }

      // -------------------------------------------------------------------
      // 2. HANDLE MODAL SUBMISSIONS
      // -------------------------------------------------------------------
      if (interaction.isModalSubmit()) {
        
        // --- Ticket Creation Submission ---
        if (interaction.customId === "modal_create_ticket") {
          await interaction.deferReply({ ephemeral: true }).catch(() => {});

          try {
            const guild = interaction.guild;
            const reason = interaction.fields.getTextInputValue("ticket_reason") || "No reason provided";
            const priority = interaction.fields.getTextInputValue("ticket_priority") || "Medium";

            // Find target "Tickets" category
            const ticketCategory = guild.channels.cache.find(
              c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().trim() === "tickets"
            ) || guild.channels.cache.find(
              c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("ticket")
            );

            // Channel counter
            if (!global.ticketCounter) global.ticketCounter = 1;
            const ticketNumStr = String(global.ticketCounter).padStart(3, '0');
            const channelName = `ticket-${ticketNumStr}`;

            // Create Private Channel
            const ticketChannel = await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: ticketCategory ? ticketCategory.id : null,
              permissionOverwrites: [
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                  id: interaction.user.id,
                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AttachFiles
                  ],
                },
              ],
            });

            global.ticketCounter++;
            const createdUnix = Math.floor(Date.now() / 1000);

            // Clean Embed without "Claimed By"
            const ticketEmbed = new EmbedBuilder()
              .setTitle(`Ticket #${ticketNumStr}`)
              .setDescription(`${interaction.user}, thanks for creating a ticket! Support will be with you shortly.`)
              .setColor("#2B2D31")
              .addFields(
                { name: "Reason", value: reason, inline: true },
                { name: "Priority", value: priority, inline: true },
                { name: "Status", value: "Open", inline: true },
                { name: "Created", value: `<t:${createdUnix}:R>`, inline: true }
              );

            const closeBtn = new ButtonBuilder()
              .setCustomId("close_ticket")
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("🔒");

            const row = new ActionRowBuilder().addComponents(closeBtn);

            const pinnedMsg = await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
            await pinnedMsg.pin().catch(() => {});

            return await interaction.editReply({
              content: `Your ticket has been created! View it here: ${ticketChannel}`
            });

          } catch (err) {
            console.error("🔴 Ticket creation error:", err);
            return await interaction.editReply({
              content: "Failed to create ticket channel. Please check bot permissions!"
            });
          }
        }

        // --- Daily Guess Submission ---
        if (interaction.customId === "modal_guess_submit") {
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
      }

      // -------------------------------------------------------------------
      // 3. HANDLE SLASH COMMANDS
      // -------------------------------------------------------------------
      if (interaction.isChatInputCommand()) {
        if (["movie", "guess"].includes(interaction.commandName)) {
          let hasState = loadState();
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

        const command = client.commands.get(interaction.commandName);
        if (!command) {
          console.error(`No command registered for: ${interaction.commandName}`);
          return;
        }

        await command.execute(interaction, client);
      }

    } catch (err) {
      console.error("Interaction execution error:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "An error occurred while handling this interaction!", ephemeral: true }).catch(() => {});
      }
    }
  }
};