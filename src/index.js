import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import messageCreate from "./events/messageCreate.js";
import interactionCreate from "./events/interactionCreate.js";
import { initDailyGuess } from "./services/dailyGuess.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`[!] Logged in as ${client.user.tag}`);
  
  // Initialize Daily Guess Service
  initDailyGuess(client);
});

client.on("messageCreate", (message) => messageCreate.execute(message, client));
client.on("interactionCreate", (interaction) => interactionCreate.execute(interaction, client));

client.login(process.env.DISCORD_TOKEN);
