import fs from "fs";
import path from "path";
import { EmbedBuilder } from "discord.js";

const GENERAL_CHAT_ID = "1506493032617349211";
const COUNTING_FILE = path.join(process.cwd(), "countingState.json");

function loadState() {
  try {
    if (fs.existsSync(COUNTING_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTING_FILE, "utf8"));
    }
  } catch (e) {}
  return { currentCount: 9, highScore: 10, lastUserId: null };
}

function saveState(state) {
  try {
    fs.writeFileSync(COUNTING_FILE, JSON.stringify({
      currentCount: state.currentCount,
      highScore: state.highScore,
      lastUserId: state.lastUserId
    }, null, 2));
  } catch (e) {}
}

const state = loadState();
const ruinedStats = new Map();

export async function handleCounting(message) {
  if (!message.channel.name.includes("counting")) return;

  const content = message.content.trim();
  const parsedNum = parseInt(content, 10);
  if (isNaN(parsedNum) || !/^\d+$/.test(content)) return;

  const userId = message.author.id;
  const expectedNum = state.currentCount + 1;

  const handleRuin = async (typedVal, reasonText) => {
    try { await message.react("❌"); } catch (e) {}

    const userRuins = (ruinedStats.get(userId) || 0) + 1;
    ruinedStats.set(userId, userRuins);

    const finalScore = state.currentCount;
    if (finalScore > state.highScore) state.highScore = finalScore;

    const ruinEmbed = new EmbedBuilder()
      .setTitle("The count was reset")
      .setDescription(
        `<@${userId}> broke the count by sending **${typedVal}** when **${expectedNum}** was expected.\n\n` +
        `**Final score**\n${finalScore}\n\n` +
        `**High score**\n${state.highScore}\n\n` +
        `**Start again with**\n1`
      )
      .setColor("#ED4245");

    await message.channel.send({ embeds: [ruinEmbed] });

    state.currentCount = 0;
    state.lastUserId = null;
    saveState(state);

    const shameRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes("hall of shame"));
    let shameMention = "💩 · Hall of Shame";

    if (shameRole) {
      shameMention = `<@&${shameRole.id}>`;
      try { await message.member.roles.add(shameRole); } catch (e) {}
    }

    const shameMsg = 
      `💩 <@${userId}> just got ${shameMention} for\n\n` +
      `ruining the count at <#${message.channel.id}>!\n\n` +
      `**Final score:** ${finalScore} • **Times ruined:** ${userRuins}\n` +
      `**Reason:** ${reasonText}`;

    const generalChannel = message.guild.channels.cache.get(GENERAL_CHAT_ID);
    if (generalChannel) await generalChannel.send(shameMsg);
  };

  if (userId === state.lastUserId) {
    return await handleRuin(parsedNum, "counting twice in a row");
  }

  if (parsedNum === expectedNum) {
    state.currentCount = expectedNum;
    state.lastUserId = userId;
    if (expectedNum > state.highScore) state.highScore = expectedNum;
    saveState(state);

    try { await message.react("✅"); } catch (e) {}
  } else {
    return await handleRuin(parsedNum, `typed **${parsedNum}** when **${expectedNum}** was expected`);
  }
}
