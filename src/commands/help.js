import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  SlashCommandBuilder 
} from "discord.js";

const SUPPORT_CHANNEL_ID = "1532045690266718258";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Displays the interactive help menu");

const CATEGORY_ORDER = ["fun", "emotes", "points", "search", "utility"];

export function getHelpData(category = "fun") {
  const pages = {
    fun: {
      title: "🎱 Commands - Fun",
      pageStr: "Page 1/5",
      content: 
        "`!8ball <question>` / `!8b <question>` - Ask the magic 8-ball\n" +
        "`!compliment @user` - Compliment someone\n" +
        "`!dice` - Roll a six-sided die\n" +
        "`!fortune` - Get a random fortune\n" +
        "`!joke` - Get a random joke\n" +
        "`!roast @user` - Playfully roast someone\n" +
        "`!games` - Browse every available game"
    },
    emotes: {
      title: "🎭 Commands - Emotes + Actions",
      pageStr: "Page 2/5",
      content: 
        "`!sleep`, `!clap`, `!confused`, `!smile`, `!sip`, `!blush`, `!think`, `!teehee`, `!shocked`, `!bleh`, `!bored`, `!nom`, `!nya`, `!yawn`, `!facepalm`, `!happy`, `!angry`, `!run`, `!nod`, `!nope`, `!dance`, `!cry`, `!pout`, `!thumbsup`, `!laugh`, `!tableflip` \n\n" +
        "`!shoot @user`, `!stare @user`, `!wave @user`, `!poke @user`, `!peck @user`, `!wink @user`, `!tickle @user`, `!highfive @user`, `!feed @user`, `!bite @user`, `!cuddle @user`, `!kick @user`, `!carry @user`, `!hug @user`, `!baka @user`, `!bonk @user`, `!pat @user`, `!kiss @user`, `!punch @user`, `!handshake @user`, `!slap @user`, `!lappillow @user`, `!blowkiss @user`, `!handhold @user`, `!salute @user`, `!yeet @user`, `!waifu @user`, `!husbando @user`"
    },
    points: {
      title: "🎲 Commands - Points",
      pageStr: "Page 3/5",
      content: 
        "`!points` / `!bal` - View your wallet and stats\n" +
        "`!transfer @member <amount>` - Send taxed points to a member\n" +
        "`!pointslb` / `!plb` - View the points leaderboard\n" +
        "`!daily` / `!checkin` - Claim 250-450 daily points\n" +
        "`!missions` / `!challenges` - Track daily and weekly challenges\n" +
        "`!shop` / `!buyxp <points>` - Buy cosmetics, boosts, or XP\n" +
        "`!inventory` / `!inv` - Manage purchased shop items\n" +
        "`!equip <item>` - Equip an owned cosmetic\n" +
        "`!unequip` - Remove equipped cosmetics\n" +
        "`!gambling` / `!casino` - View every gambling game\n" +
        "`!slots [wager]` - Spin the slot machine\n" +
        "`!coinflip [side] [wager]` / `!cf` - Bet on heads or tails\n" +
        "`!gamble <wager>` - Risk points at 50/50 odds\n" +
        "`!lottery [points]` / `!lotto` - Enter the daily jackpot\n" +
        "`!blackjack [wager]` / `!bj` - Play against the dealer\n" +
        "`!snailgarden [wager]` / `!sg` - Plant flowers and cash out\n" +
        "`!mines [wager] [mines]` - Reveal tiles and cash out\n" +
        "`!highlow [wager]` / `!hl` - Predict higher or lower"
    },
    search: {
      title: "🔍 Commands - Search",
      pageStr: "Page 4/5",
      content: 
        "`!anime <title>` - Search for an anime\n" +
        "`!game <title>` - Search for a Steam game\n" +
        "`!gif <query>` - Search for a GIF\n" +
        "`!image <query>` - Search the web for an image\n" +
        "`!kickstream <username>` - Search for a Kick streamer\n" +
        "`!manga <title>` - Search for a manga\n" +
        "`!movie <title>` - Search for a movie\n" +
        "`!pokemon <name/id>` - Search for a Pokemon\n" +
        "`!series <title>` - Search for a TV series\n" +
        "`!twitch <username>` - Search for a Twitch streamer\n" +
        "`!urban <term>` - Search Urban Dictionary in age-restricted channels\n" +
        "`!youtube <query>` - Search for a YouTube video"
    },
    utility: {
      title: "🔧 Commands - Utility",
      pageStr: "Page 5/5",
      content: 
        "Use these in <#1535220828457668640>.\n\n" +
        "`!help [command]` / `!h [command]` - Open help or a command guide\n" +
        "`!nickname <name>` / `!nick <name>` - Change your server nickname\n" +
        "`!removenickname` - Remove your server nickname\n" +
        "`!ping` - Show bot and Discord latency\n" +
        "`!level [@member]` / `!rank [@member]` - View a leveling rank card\n" +
        "`!profile [@member]` - View combined member statistics\n" +
        "`!leaderboard [page]` / `!lb [page]` - View the XP leaderboard\n" +
        "`!status` - Show the current bot status\n" +
        "`!support` - Get support information\n" +
        "`!diagnose` - Check configuration and permissions\n" +
        "`!counting help` / `!count help` - Open the counting guide"
    }
  };

  const currentIndex = CATEGORY_ORDER.indexOf(category);
  const activeCategory = currentIndex !== -1 ? category : "fun";
  const selected = pages[activeCategory];

  const prevCategory = CATEGORY_ORDER[(currentIndex - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length];
  const nextCategory = CATEGORY_ORDER[(currentIndex + 1) % CATEGORY_ORDER.length];

  const embed = new EmbedBuilder()
    .setDescription(
      "```\nUse the select menu to explore [!] MutyamBot\n```\n" +
      `**${selected.title}**\n` +
      `${selected.pageStr}\n\n` +
      `${selected.content}`
    )
    .setColor("#2B2D31");

  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("help_btn_fun").setLabel("Fun").setEmoji("8️⃣").setStyle(activeCategory === "fun" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("help_btn_emotes").setLabel("Emotes + Actions").setEmoji("🎭").setStyle(activeCategory === "emotes" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("help_btn_points").setLabel("Points").setEmoji("🎲").setStyle(activeCategory === "points" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("help_btn_search").setLabel("Search").setEmoji("🔍").setStyle(activeCategory === "search" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("help_btn_utility").setLabel("Utility").setEmoji("🔧").setStyle(activeCategory === "utility" ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_select_category")
      .setPlaceholder("Select a category")
      .addOptions([
        { label: "Mutyam Links", description: "View social and community links", value: "links", emoji: "🔗" },
        { label: "Commands", description: "View MutyamBot commands", value: "fun", emoji: "🤖" },
        { label: "Server Bots Help", description: "View help commands for server bots", value: "server_bots", emoji: "❓" },
        { label: "Support", description: "Open a ticket or get support", value: "support", emoji: "📩" }
      ])
  );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`help_nav_${prevCategory}`).setLabel("<").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`help_nav_${nextCategory}`).setLabel(">").setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [btnRow, selectRow, navRow] };
}

export function getLinksEmbed() {
  const embed = new EmbedBuilder()
    .setDescription(
      "```\nUse the select menu to explore [!] MutyamBot\n```\n" +
      "**Mutyam Links**\n" +
      "**Twitch:** https://www.twitch.tv/aakarimutyam\n" +
      "**Kick:** https://kick.com/aakarimutyam\n" +
      "**Youtube:** https://www.youtube.com/@aakarimutyamyt\n" +
      "**TikTok:** https://www.tiktok.com/@aakarimutyam\n" +
      "**Instagram:** https://instagram.com/aakarimutyam"
    )
    .setColor("#2B2D31");

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_select_category")
      .setPlaceholder("Select a category")
      .addOptions([
        { label: "Mutyam Links", description: "View social and community links", value: "links", emoji: "🔗" },
        { label: "Commands", description: "View MutyamBot commands", value: "fun", emoji: "🤖" },
        { label: "Server Bots Help", description: "View help commands for server bots", value: "server_bots", emoji: "❓" },
        { label: "Support", description: "Open a ticket or get support", value: "support", emoji: "📩" }
      ])
  );

  return { embeds: [embed], components: [selectRow] };
}

export function getSupportEmbed() {
  const embed = new EmbedBuilder()
    .setDescription(
      "```\nUse the select menu to explore [!] MutyamBot\n```\n" +
      "**Support**\n" +
      "Need help?\n" +
      `Please open a ticket at <#${SUPPORT_CHANNEL_ID}> to solve your issue.`
    )
    .setColor("#2B2D31");

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_select_category")
      .setPlaceholder("Select a category")
      .addOptions([
        { label: "Mutyam Links", description: "View social and community links", value: "links", emoji: "🔗" },
        { label: "Commands", description: "View MutyamBot commands", value: "fun", emoji: "🤖" },
        { label: "Server Bots Help", description: "View help commands for server bots", value: "server_bots", emoji: "❓" },
        { label: "Support", description: "Open a ticket or get support", value: "support", emoji: "📩" }
      ])
  );

  return { embeds: [embed], components: [selectRow] };
}

export async function execute(interaction) {
  const data = getHelpData("fun");
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(data);
  } else {
    await interaction.reply(data);
  }
}
