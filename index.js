require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = 8080;

// Function to generate a unique user ID based on user-agent and IP
const generateUserId = (req) => {
    return crypto.createHash('sha256').update(req.headers['user-agent'] + req.ip).digest('hex');
};

// Function to check if a user is banned
const checkIfBanned = (userId) => {
    const bannedUsers = process.env.BANNED_USERS ? process.env.BANNED_USERS.split('/') : [];
    console.log('Banned Users:', bannedUsers); // Debugging
    console.log('User ID:', userId); // Debugging
    return bannedUsers.includes(userId);
};

const generateNonce = () => crypto.randomBytes(16).toString('base64');

app.use((req, res, next) => {
    res.locals.nonce = generateNonce();
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            imgSrc: ["'self'", "https://gido-web.onrender.com", "data:", "https://cdn.discordapp.com", "https://images-ext-1.discordapp.net", "https://media.discordapp.net/attachments/", "https://media.discordapp.net/", "/images/"],
            connectSrc: ["'self'", "https://gido-web.onrender.com", "https://fetch-bot-1.onrender.com"],
            scriptSrc: ["'self'", "https://gido-web.onrender.com"],
            styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "https://gido-web.onrender.com"],
        },
    },
}));

app.get('/', (req, res) => {
    res.setHeader('Content-Security-Policy', `style-src 'self' 'nonce-${res.locals.nonce}'`);
    const imagePath = path.join(__dirname, 'main-web/index.html');
    res.sendFile(imagePath);
});

app.get('/404.css', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/errors/404/404.css');
    res.sendFile(imagePath);
});

app.get('/styles.css', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/styles.css');
    res.sendFile(imagePath);
});

app.get('/scripts.js', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/scripts.js');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(imagePath);
});

app.use(bodyParser.json());

app.post('/api/support', async (req, res) => {
    const { nickname, email, description } = req.body;
    const webhookURL = process.env.WEBHOOK_URL;
    const userId = generateUserId(req);

    // Check if nickname, email, or description is missing
    if (!nickname || !email || !description) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if user is banned
    if (checkIfBanned(userId)) {
        return res.status(403).json({
            message: 'You are banned from submitting requests. Please contact support on Discord for more info: https://discord.gg/Gq48UpPrXH',
        });
    }

    // Extract IP address
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const embed = {
        content: `<@&1272577631191175272>`,
        embeds: [
            {
                title: "Support Request",
                color: 0x3498db,
                fields: [
                    {
                        name: "Nickname",
                        value: nickname,
                        inline: false
                    },
                    {
                        name: "Email",
                        value: email,
                        inline: false
                    },
                    {
                        name: "Description",
                        value: description,
                        inline: false
                    },
                    {
                        name: "User ID",
                        value: userId,
                        inline: false
                    },
                    {
                        name: "IP Address",
                        value: ipAddress,
                        inline: false
                    }
                ],
                footer: {
                    text: "Help Within 24 Hours!",
                },
                timestamp: new Date().toISOString()
            }
        ]
    };

    try {
        const response = await axios.post(webhookURL, embed);

        if (response.status === 204) {
            res.status(200).json({ message: 'Request submitted successfully. You will receive an email within 24 hours.' });
        } else {
            console.error('Failed to submit request:', response.statusText);
            res.status(500).json({ message: 'Failed to submit request.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error submitting request.' });
    }
});
process.on('uncaughtException', (err) => {
    console.log(`Unexpected error: ${err.message}`, err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled promise rejection:', reason);
    process.exit(1);
});

app.get('/images/*', (req, res) => {
    const imageName = req.params[0];
    const imagePath = path.join(__dirname, 'main-web/images', imageName);
    res.sendFile(imagePath);
});

app.use((req, res, next) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'main-web/errors/404/404.html'));
    } else {
        res.status(404).send('Resource not found');
    }
});

app.listen(PORT, () => console.log(`Online on: ${PORT}`));
