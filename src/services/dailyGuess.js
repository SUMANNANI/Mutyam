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

// Get Unix timestamps for 14:00 (2 PM) and 20:00 (8 PM) IST
function getTargetTimestamps() {
  const now = new Date();
  
  // Calculate IST offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utcNow + istOffset);

  const h1 = new Date(istDate); h1.setHours(14, 0, 0, 0);
  const h2 = new Date(istDate); h2.setHours(20, 0, 0, 0);

  // Convert back to Epoch Unix Timestamp (seconds)
  const h1Unix = Math.floor((h1.getTime() - istOffset) / 1000);
  const h2Unix = Math.floor((h2.getTime() - istOffset) / 1000);

  return { hint1Unix: h1Unix, hint2Unix: h2Unix };
}

// Get current hour in IST timezone (0-23)
function getISTHour() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hour12: false
  }).formatToParts(new Date());

  const hourObj = parts.find(p => p.type === 'hour');
  return parseInt(hourObj?.value || '0', 10);
}

// Get today's YYYY-MM-DD string in IST timezone
function getISTDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

export async function endPreviousRound(client) {
  if (!global.dailyGuess || !global.dailyGuess.messageId) return;

  try {
    const channel = await client.channels.fetch(GUESS_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const oldMsg = await channel.messages.fetch(global.dailyGuess.messageId).catch(() => null);
    if (!oldMsg) return;

    const prevMovie = global.dailyGuess.movie;
    if (!prevMovie) return;

    // Build reveal embed
    const revealEmbed = new EmbedBuilder()
      .setTitle(`📢 Round #${global.dailyGuess.round || 1} Ended!`)
      .setDescription(
        `The secret movie was **${prevMovie.title}** (${prevMovie.released})!\n\n` +
        `**Total Participants:** ${global.dailyGuess.tried?.size || 0}\n` +
        `**Total Winners:** ${global.dailyGuess.correct?.size || 0}\n` +
        `**First Winner:** ${global.dailyGuess.firstWinner ? `<@${global.dailyGuess.firstWinner}>` : "None"}`
      )
      .setImage(prevMovie.poster)
      .setColor("#57F287");

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_make_guess").setLabel("Round Ended").setEmoji("🔒").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("btn_leaderboard").setLabel("Weekly Leaderboard").setEmoji("🏆").setStyle(ButtonStyle.Secondary).setDisabled(false)
    );

    // EDIT existing message instead of sending a new channel message!
    await oldMsg.edit({ embeds: [revealEmbed], components: [disabledRow] });
  } catch (err) {
    console.error("Error editing ended round message:", err);
  }
}

export async function runNewRound(client) {
  try {
    const channel = await client.channels.fetch(GUESS_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    // First end previous round by editing old message (if active)
    if (global.dailyGuess && global.dailyGuess.stage < 4) {
      await endPreviousRound(client);
    }

    const currentRound = global.dailyGuess?.round ? global.dailyGuess.round + 1 : 1;
    const newMovie = await fetchRandomMovie();
    const nowUnix = Math.floor(Date.now() / 1000);
    const { hint1Unix, hint2Unix } = getTargetTimestamps();
    const todayStr = getISTDateString();

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

  // Don't downgrade stage
  if (global.dailyGuess.stage >= targetStage) return;

  try {
    const channel = await client.channels.fetch(GUESS_CHANNEL_ID).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(global.dailyGuess.messageId).catch(() => null);
    if (!msg) return;

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
        `Later correct answers: **200-600 points**, decreasing with time\n\n` +
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
  const todayStr = getISTDateString();

  if (!hasValidState || !global.dailyGuess || global.dailyGuess.lastPostDate !== todayStr) {
    await runNewRound(client);
  } else {
    const currentHour = getISTHour();
    if (currentHour >= 20 && global.dailyGuess.stage < 3) {
      await updateStage(client, 3);
    } else if (currentHour >= 14 && global.dailyGuess.stage < 2) {
      await updateStage(client, 2);
    }
  }
}

export function initDailyGuess(client) {
  checkAndCatchUp(client);

  // Scheduled Crons (Asia/Kolkata timezone)
  nodeCron.schedule("0 8 * * *", () => runNewRound(client), { timezone: TIMEZONE });
  nodeCron.schedule("0 14 * * *", () => updateStage(client, 2), { timezone: TIMEZONE });
  nodeCron.schedule("0 20 * * *", () => updateStage(client, 3), { timezone: TIMEZONE });

  // Safety ticker every minute to auto-check hint stages
  setInterval(() => {
    if (!global.dailyGuess) return;
    const currentHour = getISTHour();
    if (currentHour >= 20 && global.dailyGuess.stage < 3) {
      updateStage(client, 3);
    } else if (currentHour >= 14 && global.dailyGuess.stage < 2) {
      updateStage(client, 2);
    }
  }, 60000);
}