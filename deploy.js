import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const commands = [];
const commandFiles = fs.readdirSync('./src/commands/Fun').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./src/commands/Fun/${file}`);
  if (command.default?.data) commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || process.env.TOKEN);

(async () => {
  try {
    console.log('Refreshing application (/) commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands!');
  } catch (error) {
    console.error(error);
  }
})();
