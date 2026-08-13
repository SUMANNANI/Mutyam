import { Client, GatewayIntentBits } from "discord.js";
import { runNewRound } from "./src/services/dailyGuess.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log("Launching Daily Guess Round #1...");
  await runNewRound(client);
  console.log("Round successfully posted!");
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
