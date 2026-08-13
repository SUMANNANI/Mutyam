import "dotenv/config";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import messageCreate from "./events/messageCreate.js";
import interactionCreate from "./events/interactionCreate.js";
import { initDailyGuess } from "./services/dailyGuess.js";
import { initLiveNotifier } from "./services/liveNotifier.js";
import { initFreeGamesNotifier } from "./services/freeGames.js";
import { initMemePoster } from "./services/memes.js"; // 1. Imported Meme Poster Service

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Load commands collection
client.commands = new Collection();

async function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      await loadCommands(fullPath);
    } else if (file.endsWith(".js")) {
      try {
        const commandModule = await import(pathToFileURL(fullPath).href);
        const command = commandModule.default || commandModule;
        if (command && command.data && command.data.name) {
          client.commands.set(command.data.name, command);
        }
      } catch (err) {
        console.warn(`[!] Skipping command ${file}:`, err.message);
      }
    }
  }
}

client.once("ready", async () => {
  console.log(`[!] Logged in as ${client.user.tag}`);

  // Load all slash commands into memory
  try {
    const commandsPath = path.join(__dirname, "commands");
    await loadCommands(commandsPath);
    console.log(`[!] Loaded ${client.commands.size} commands successfully!`);
  } catch (cmdErr) {
    console.error("[!] Error loading commands:", cmdErr);
  }

  // Initialize Daily Guess Service
  try {
    initDailyGuess(client);
  } catch (err) {
    // optional service fallback
  }

  // Initialize Live Stream Notifier Service
  try {
    const LIVE_STREAM_CHANNEL_ID = "1532265565668773989";
    initLiveNotifier(client, LIVE_STREAM_CHANNEL_ID);
  } catch (err) {
    console.error("[!] Error initializing Live Notifier:", err);
  }

  // Initialize Free Games Notifier Service
  try {
    const FREE_GAMES_CHANNEL_ID = "1524500877661175828";
    initFreeGamesNotifier(client, FREE_GAMES_CHANNEL_ID);
  } catch (err) {
    console.error("[!] Error initializing Free Games Notifier:", err);
  }

  // Initialize Meme Poster Service
  try {
    const MEMES_CHANNEL_ID = "1506493106663723029"; // Your #memes channel ID
    initMemePoster(client, MEMES_CHANNEL_ID);
  } catch (err) {
    console.error("[!] Error initializing Meme Poster:", err);
  }
});

client.on("messageCreate", (message) => messageCreate.execute(message, client));
client.on("interactionCreate", (interaction) => interactionCreate.execute(interaction, client));

client.login(process.env.DISCORD_TOKEN);