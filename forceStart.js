import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { runNewRound } from "./src/services/dailyGuess.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once("ready", async () => {
  console.log("[+] Forcing new Daily Guess round...");
  await runNewRound(client);
  console.log("[+] Round posted and dailyState.json saved!");
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
