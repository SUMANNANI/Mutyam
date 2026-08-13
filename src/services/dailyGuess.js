import nodeCron from "node-cron";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { OMDB_API_KEY } from "../config/omdb.js";
import fs from "fs";
import path from "path";

const GUESS_CHANNEL_ID = "1535220828457668640";
const STATE_FILE = path.join(process.cwd(), "dailyState.json");
const TIMEZONE = "Asia/Kolkata";

const imdbList = [
  "tt3896198", "tt0848228", "tt2638144", "tt10872600", "tt1160419",
  "tt0468357", "tt1375666", "tt0111161", "tt0068646", "tt0414993"
];

export function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (parsed && parsed.movie) {
        global.dailyGuess = {
          ...parsed,
          tried: new Set(parsed.tried || []),
          correct: new Set(parsed.correct || [])
        };
        return true;
      }
    }
  } catch (err) {
    console.error("Error loading dailyState.json:", err);
  }
  return false;
}

export function saveState() {
  if (!global.dailyGuess) return;
  try {
    const dataToSave = {
      ...global.dailyGuess,
      tried: Array.from(global.dailyGuess.tried || []),
      correct: Array.from(global.dailyGuess.correct || [])
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (err) {
    console.error("Error saving dailyState.json:", err);
  }
}

async function fetchRandomMovie() {
  const randomId = imdbList[Math.floor(Math.random() * imdbList.length)];
  const res = await fetch(`https://www.omdbapi.com/?i=${randomId}&apikey=${OMDB_API_KEY}`);
  const data = await res.json();

  const plotWords = data.Plot ? data.Plot.split(" ") : ["No", "plot", "available"];
  const midPoint = Math.ceil(plotWords.length / 2);

  // Fallback to direct poster if Weserv proxy fails
  const rawPoster = data.Poster && data.Poster !== "N/A" ? data.Poster : "https://via.placeholder.com/300x450?text=No+Poster";
  const heavyBlur = `https://wsrv.nl/?url=${encodeURIComponent(rawPoster)}&blur=12&output=jpg`;
  const lightBlur = `https://wsrv.nl/?url=${encodeURIComponent(rawPoster)}&blur=5&output=jpg`;

  return {
    title: data.Title,
    genre: data.Genre,
    released: data.Year,
    runtime: data.Runtime,
    plot1: plotWords.slice(0, midPoint).join(" "),
    plot2: plotWords.slice(midPoint).join(" "),
    poster: rawPoster,
    blurred_heavy: heavyBlur,
    blurred_light: lightBlur
  };
}

function getTargetTimestamps() {
  const now = new Date();
  const h1 = new Date(now); h1.setHours(14, 0, 0, 0);
  const h2 = new Date(now); h2.setHours(20, 0, 0, 0);

  return {
    hint1Unix: Math.floor(h1.getTime() / 1000),
    hint2Unix: Math.floor(h2.getTime() / 1000)
  };
}

export async function runNewRound(client) {
  try {
    const channel = await client.channels.fetch(GUESS_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    if (global.dailyGuess && global.dailyGuess.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(global.dailyGuess.messageId).catch(() => null);
        if (oldMsg) {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("btn_make_guess").setLabel("Round Ended").setEmoji("🔒").setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId("btn_leaderboard").setLabel("Weekly Leaderboard").setEmoji("🏆").setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await oldMsg.edit({ components: [disabledRow] });
        }
      } catch (err) {}
    }

    if (global.dailyGuess && global.dailyGuess.movie) {
      const prevMovie = global.dailyGuess.movie;
      const revealEmbed = new EmbedBuilder()
        .setTitle(`📢 Round #${global.dailyGuess.round || 1} Ended!`)
        .setDescription(
          `The secret movie was **${prevMovie.title}** (${prevMovie.released})!\n\n` +
          `**Total Participants:** ${global.dailyGuess.tried?.size || 0}\n` +
          `**Total Winners:** ${global.dailyGuess.correct?.size || 0}\n` +
          `**First Winner:** ${global.dailyGuess.firstWinner ? `<@${global.dailyGuess.firstWinner}>` : "None"}`
        )
        .setImage(prevMovie.poster)
        .setColor("#2ECC71");

      await channel.send({ embeds: [revealEmbed] });
    }

    const currentRound = global.dailyGuess?.round ? global.dailyGuess.round + 1 : 1;
    const newMovie = await fetchRandomMovie();
    const nowUnix = Math.floor(Date.now() / 1000);
    const { hint1Unix, hint2Unix } = getTargetTimestamps();
    const todayStr = new Date().toISOString().split("T")[0];

    global.dailyGuess = {
      round: currentRound,
      movie: newMovie,
      tried: new Set(),
      correct: new Set(),
      firstWinner: null,
      firstWinnerTimestamp: null,
      startUnix: nowUnix,
      hint1Unix: hint1Unix,
      hint2Unix: hint2Unix,
      stage: 1,
      lastPostDate: todayStr
    };

    const state = global.dailyGuess;

    const embed = new EmbedBuilder()
      .setTitle(`🎬 Daily Guess #${state.round}`)
      .setDescription(
        `Identify today's **movie** from the hidden artwork. Submit privately; the answer stays hidden until tomorrow's round.\n\n` +
        `**Reward**\n` +
        `First correct answer: **1,000 points**\n` +
        `Later correct answers: **200-600 points**, decreasing with time\n\n` +
        `**Round progress**\n` +
        `People tried: **0**\n` +
        `Correct guesses: **0**\n` +
        `First correct: Waiting for the first correct answer\n\n` +
        `**Hints**\n` +
        `No hints yet. First hint <t:${state.hint1Unix}:R>.`
      )
      .setImage(newMovie.blurred_heavy)
      .setColor("#5865F2")
      .setTimestamp(Date.now())
      .setFooter({ text: "Weekly rankings refresh every Monday. Guess scores and wallet points do not reset. | Posted" });

    const activeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_make_guess").setLabel("Make a Guess").setEmoji("🔍").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_leaderboard").setLabel("Weekly Leaderboard").setEmoji("🏆").setStyle(ButtonStyle.Secondary)
    );

    const msg = await channel.send({ embeds: [embed], components: [activeRow] });
    global.dailyGuess.messageId = msg.id;
    saveState();
  } catch (e) {
    console.error("Error starting daily guess round:", e);
  }
}

export async function updateStage(client, targetStage) {
  if (!global.dailyGuess) loadState();
  if (!global.dailyGuess || !global.dailyGuess.messageId) return;

  try {
    const channel = await client.channels.fetch(GUESS_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(global.dailyGuess.messageId);
    const state = global.dailyGuess;
    state.stage = targetStage;

    const firstWinnerStr = state.firstWinner
      ? `<@${state.firstWinner}> at <t:${state.firstWinnerTimestamp}:t> (<t:${state.firstWinnerTimestamp}:R>)`
      : "Waiting for the first correct answer";

    let updatedDescription = "";

    if (targetStage === 2) {
      updatedDescription = 
        `Identify today's **movie** from the hidden artwork. Submit privately; the answer stays hidden until tomorrow's round.\n\n` +
        `**Reward**\n` +
        `First correct answer: **1,000 points**\n` +
        `Later correct answers: **200-600 points**, decreasing with time\n\n` +
        `**Round progress**\n` +
        `People tried: **${state.tried.size}**\n` +
        `Correct guesses: **${state.correct.size}**\n` +
        `First correct: ${firstWinnerStr}\n\n` +
        `**Hints**\n` +
        `**1.** Genre: **${state.movie.genre}**\n` +
        `**Plot (first half):** ${state.movie.plot1}\n\n` +
        `*Second hint <t:${state.hint2Unix}:R>.*`;
    } else if (targetStage === 3) {
      updatedDescription = 
        `Identify today's **movie** from the hidden artwork. Submit privately; the answer stays hidden until tomorrow's round.\n\n` +
        `**Reward**\n` +
        `First correct answer: **1,000 points**\n` +
        `Later correct answers: **0-200 points**, decreasing with time\n\n` +
        `**Round progress**\n` +
        `People tried: **${state.tried.size}**\n` +
        `Correct guesses: **${state.correct.size}**\n` +
        `First correct: ${firstWinnerStr}\n\n` +
        `**Hints**\n` +
        `**1.** Genre: **${state.movie.genre}**\n` +
        `**Plot (first half):** ${state.movie.plot1}\n` +
        `**2.** Released: **${state.movie.released}** | Runtime: **${state.movie.runtime}**\n` +
        `**Plot (second half):** ${state.movie.plot2}`;
    }

    const embed = EmbedBuilder.from(msg.embeds[0]).setDescription(updatedDescription);
    if (targetStage === 3) embed.setImage(state.movie.blurred_light);

    await msg.edit({ embeds: [embed] });
    saveState();
  } catch (e) {
    console.error(`Error updating stage ${targetStage}:`, e);
  }
}

export async function checkAndCatchUp(client) {
  const hasValidState = loadState();
  const todayStr = new Date().toISOString().split("T")[0];

  if (!hasValidState || !global.dailyGuess || global.dailyGuess.lastPostDate !== todayStr) {
    await runNewRound(client);
  } else {
    const currentHour = new Date().getHours();
    if (currentHour >= 20 && global.dailyGuess.stage < 3) {
      await updateStage(client, 3);
    } else if (currentHour >= 14 && global.dailyGuess.stage < 2) {
      await updateStage(client, 2);
    }
  }
}

export function initDailyGuess(client) {
  checkAndCatchUp(client);

  nodeCron.schedule("0 8 * * *", () => runNewRound(client), { timezone: TIMEZONE });
  nodeCron.schedule("0 14 * * *", () => updateStage(client, 2), { timezone: TIMEZONE });
  nodeCron.schedule("0 20 * * *", () => updateStage(client, 3), { timezone: TIMEZONE });
}
