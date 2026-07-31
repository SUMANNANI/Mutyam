import {
    checkMovieAnswer,
    hasUserGuessedToday,
    saveUserGuess,
    getMovieReward,
    getDailyMovie,
} from "../services/games/movieService.js";

import { addMoney } from "../utils/economy.js";
import { successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { ErrorTypes, replyUserError } from "../utils/errorHandler.js";
import { MessageFlags } from "discord.js";

export default {
    name: "movie_guess_modal",

    async execute(interaction) {
        try {
            const answer = interaction.fields.getTextInputValue("movie_answer");

            if (hasUserGuessedToday(interaction.user.id)) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: "🎬 You have already guessed today's movie. Come back tomorrow!",
                });
            }

            if (!checkMovieAnswer(answer)) {
                saveUserGuess(interaction.user.id);

                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: "❌ Wrong answer! Better luck tomorrow.",
                });
            }

            const reward = getMovieReward();

            await addMoney(
                interaction.client,
                interaction.guildId,
                interaction.user.id,
                reward,
                "wallet"
            );

            saveUserGuess(interaction.user.id);

            const movie = getDailyMovie();

            await interaction.reply({
                embeds: [
                    successEmbed(
                        "🎉 Correct Answer!",
                        `🎬 **${movie.title}**\n\n💰 You earned **${reward} coins!**`
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            logger.error("Movie Guess Error:", error);

            await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: "Something went wrong. Please try again.",
            });
        }
    },
};