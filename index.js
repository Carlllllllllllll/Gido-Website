require('dotenv').config(); 
const { Client, GatewayIntentBits, Events, EmbedBuilder, ActivityType, DiscordAPIError } = require('discord.js');
const axios = require('axios');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences
    ]
});

const OTHER_BOT_ID = '1272547950744178782';
const STATUS_CHANNEL_ID = '1272939874084720763';
const STATUS_EMBED_MESSAGE_ID = '1280705506918535259';
const WEBSITE_CHANNEL_ID = '1277983583868551189';
const WEBSITE_EMBED_MESSAGE_ID = '1281428228212260966'; 
const PING_CHANNEL_ID = '1277986331170963507';
const PING_ROLE_ID = '1279995372235919422';

const WEBSITE_URL = 'https://gido-bot-web.onrender.com';

let botStatusMessage;
let websiteStatusMessage;
let botIsOnline = false;
let lastOnlineTimestamp = null;
let lastOfflineTimestamp = null;
let lastWebsiteStatus = 'Checking...';

app.use(cors({
  origin: 'https://gido-bot-web.onrender.com',
  methods: 'GET,POST',
}));

app.get('/api/status', (req, res) => {
    res.json({
        status: botIsOnline ? 'online' : 'offline'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

client.on('error', (error) => {
    console.error(`Discord client error: ${error.message}`);
});

client.on('warn', (warning) => {
    console.warn(`Discord client warning: ${warning.message}`);
});

client.once(Events.ClientReady, async () => {
    console.log('Bot is online!');
    try {
        const statusChannel = await client.channels.fetch(STATUS_CHANNEL_ID);
        if (!statusChannel) return;

        try {
            botStatusMessage = await statusChannel.messages.fetch(STATUS_EMBED_MESSAGE_ID).catch(() => null);
            if (!botStatusMessage) {
                botStatusMessage = await statusChannel.send({ embeds: [await createBotStatusEmbed(true)] });
            }
        } catch (error) {
            console.error(`Error fetching bot status message: ${error.message}`);
        }

        const websiteChannel = await client.channels.fetch(WEBSITE_CHANNEL_ID);
        if (!websiteChannel) return;

        try {
            websiteStatusMessage = await websiteChannel.messages.fetch(WEBSITE_EMBED_MESSAGE_ID).catch(() => null);
            if (!websiteStatusMessage) {
                websiteStatusMessage = await websiteChannel.send({ embeds: [await createWebsiteStatusEmbed('Checking...')] });
            }
        } catch (error) {
            console.error(`Error fetching website status message: ${error.message}`);
        }

        await client.user.setActivity('🔍 Gido Bot/Website', { type: ActivityType.Watching });

        const checkWebsiteStatusAndUpdateEmbed = async () => {
            const currentStatus = await checkWebsiteStatus();
            if (currentStatus !== lastWebsiteStatus) {
                lastWebsiteStatus = currentStatus;
                await createOrUpdateWebsiteStatusEmbed(currentStatus);
            }
        };

        checkWebsiteStatusAndUpdateEmbed();
        setInterval(checkWebsiteStatusAndUpdateEmbed, 60000);

    } catch (error) {
        console.error(`Error in ClientReady event: ${error.message}`);
    }
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
    if (newPresence.userId === OTHER_BOT_ID) {
        const isOnline = ['online', 'idle', 'dnd'].includes(newPresence.status || 'offline');
        const now = Math.floor(Date.now() / 1000);

        if (isOnline && !botIsOnline) {
            botIsOnline = true;
            lastOnlineTimestamp = now;
            lastOfflineTimestamp = null;
            await updateBotStatusEmbed(await createBotStatusEmbed(true));
            await sendPing(`<@&${PING_ROLE_ID}> 🟢 Bot is back online!`);
        } else if (!isOnline && botIsOnline) {
            botIsOnline = false;
            lastOfflineTimestamp = now;
            lastOnlineTimestamp = null;
            await sendPing(`<@&${PING_ROLE_ID}> 🛑 The bot is now offline!`);
            await updateBotStatusEmbed(await createBotStatusEmbed(false));
        }
    }
});

const checkWebsiteStatus = async () => {
    try {
        const response = await axios.get(WEBSITE_URL);
        const isGoodResponse = response.status === 200 && response.data.trim().length > 0;
        return isGoodResponse ? '🟢 Online' : '🔴 Offline';
    } catch (error) {
        return '🔴 Offline';
    }
};

const createOrUpdateWebsiteStatusEmbed = async (status) => {
    if (websiteStatusMessage) {
        try {
            await websiteStatusMessage.edit({ embeds: [await createWebsiteStatusEmbed(status)] });
            console.log('Website status embed updated successfully');
        } catch (error) {
            console.error(`Error updating website status embed: ${error.message}`);
            if (error instanceof DiscordAPIError && error.code === 10008) {
                console.error('Message not found or invalid ID');
            }
        }
    } else {
        const channel = await client.channels.fetch(WEBSITE_CHANNEL_ID);
        if (channel) {
            try {
                websiteStatusMessage = await channel.send({ embeds: [await createWebsiteStatusEmbed(status)] });
            } catch (error) {
                console.error(`Error creating website status embed: ${error.message}`);
            }
        }
    }
};

async function updateBotStatusEmbed(embed) {
    if (botStatusMessage) {
        try {
            await botStatusMessage.edit({ embeds: [embed] });
            console.log('Bot status embed updated successfully');
        } catch (error) {
            console.error(`Error updating bot status embed: ${error.message}`);
            if (error instanceof DiscordAPIError && error.code === 10008) {
                console.error('Message not found or invalid ID');
            }
        }
    }
}

async function createBotStatusEmbed(online) {
    const description = online
        ? `**Status**: 🟢 Online\n**Online since**: <t:${lastOnlineTimestamp}:R>\n**Gido Bot Invite Link**: [Click Here](https://discord.com/oauth2/authorize?client_id=1272547950744178782&permissions=8&integration_type=0&scope=bot)`
        : `**Status**: 🔴 Offline\n**Offline since**: <t:${lastOfflineTimestamp}:R>\n**Gido Bot Invite Link**: [Click Here](https://discord.com/oauth2/authorize?client_id=1272547950744178782&permissions=8&integration_type=0&scope=bot)`;

    return new EmbedBuilder()
        .setTitle('🔄 Bot Status')
        .setDescription(description)
        .setColor(online ? 0x00ff00 : 0xff0000)
        .setFooter({ text: 'Thanks for using Gido Bot 😊' })
        .setThumbnail('https://media.discordapp.net/attachments/1272578222164541460/1278278392604786829/Gido.png?ex=66db6dc6&is=66da1c46&hm=134e3cb4bfed9c046e4ef10ea2eb247b31d942fd16d6ce19ba309eb28ebca0ab&=&format=webp&quality=lossless&width=424&height=424')
        .setImage('https://media.discordapp.net/attachments/1272578222164541460/1278278466239856712/gIDO_LOGO.gif?ex=66db6dd7&is=66da1c57&hm=6636580839cdd66497ca171f58d46b93d4180d4d044e591cb64e871ad69d7b43&=&width=550&height=194');
}

const createWebsiteStatusEmbed = async (status) => {
    const now = Math.floor(Date.now() / 1000);
    const onlineSince = botIsOnline ? (lastOnlineTimestamp || now) : (lastOfflineTimestamp || now);
    const description = status === '🟢 Online'
        ? `**Current Status:** ${status}\n**Web Online Since:** <t:${onlineSince}:R>\n**Website Link**: [Click Here](https://gido-bot-web.onrender.com/)`
        : `**Current Status:** ${status}\n**Web Offline Since:** <t:${onlineSince}:R>\n**Website Link**: [Click Here](https://gido-bot-web.onrender.com/)`;

    return new EmbedBuilder()
        .setTitle('🔄 Website Status')
        .setDescription(description)
        .setColor(status === '🟢 Online' ? '#00FF00' : '#FF0000')
        .setFooter({ text: 'Thanks for using Gido Website 😊' })
        .setThumbnail('https://media.discordapp.net/attachments/1272578222164541460/1281437526317600821/Gido-Carl.png?ex=66dbb732&is=66da65b2&hm=0b355cfc56f20ea283b0931de66a04c0a8e28fcbef2c9298c50ba26da49cf2b8&=&format=webp&quality=lossless&width=424&height=424')
        .setImage('https://media.discordapp.net/attachments/1272578222164541460/1281437525872738314/Gido-web-Carl.gif?ex=66e05472&is=66df02f2&hm=c5d42e6059910062a21451ef476e5dc2fee05f17f7f748ac261835a2d52c2fa8&=&width=832&height=468');
}

async function sendPing(message) {
    const pingChannel = await client.channels.fetch(PING_CHANNEL_ID);
    if (pingChannel) {
        try {
            await pingChannel.send(message);
        } catch (error) {
            console.error(`Error sending ping message: ${error.message}`);
        }
    }
}

client.login(process.env.BOT_TOKEN);
