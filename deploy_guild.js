import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = "1532052700211183678"; // Your Server ID

if (!token || !clientId) {
  console.error("Missing TOKEN or CLIENT_ID in environment variables!");
  process.exit(1);
}

const commands = [];
const commandFiles = fs.readdirSync('./src/commands/Fun').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./src/commands/Fun/${file}`);
  if (command.default?.data) commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Pushing Slash Commands instantly to Guild...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('Guild commands registered successfully!');
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
