import { Client, GatewayIntentBits } from "discord.js";
import { runNewRound } from "./src/services/dailyGuess.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log("Forcing Daily Guess new round creation...");
  await runNewRound(client);
  console.log("New round posted successfully!");
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
