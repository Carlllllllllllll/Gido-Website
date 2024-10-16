require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = 8080;

const bannedLogCache = {};

const generateUserId = (req) => {
    return crypto.createHash('sha256').update(req.headers['user-agent'] + req.ip).digest('hex');
};

const checkIfBanned = async (userId) => {
    const bannedUsers = process.env.BANNED_USERS ? process.env.BANNED_USERS.split('/') : [];
    console.log('Banned Users List:', bannedUsers); // Debugging line
    console.log('Checking User ID:', userId); // Debugging line

    if (bannedUsers.includes(userId)) {
        const currentTime = Date.now();
        const lastLogTime = bannedLogCache[userId] || 0;

        if (currentTime - lastLogTime > 60 * 60 * 1000) {
            bannedLogCache[userId] = currentTime;

            const bannedWebhook = process.env.BANNED_WEBHOOK;
            try {
                await axios.post(bannedWebhook, {
                    content: `Banned user tried to submit a request: User ID - ${userId}`
                });
                console.log('Banned user logged to webhook:', userId); // Debugging line
            } catch (error) {
                console.error('Failed to send banned user log to webhook:', error);
            }
        }

        return true; // User is banned
    }

    return false; // User is not banned
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
            imgSrc: ["'self'", "https://gido-web.ooguy.com", "data:", "https://cdn.discordapp.com", "https://images-ext-1.discordapp.net", "https://media.discordapp.net/attachments/", "https://media.discordapp.net/", "/images/", "https://cdn.discordapp.com/attachments/1272578222164541460/1295775574089928826/Add_a_heading.gif?ex=6710894b&is=670f37cb&hm=2f78cf3c1095a7c851af63497effb6b484c44877b9ceff91af8c0aa427630e12&"],
            connectSrc: ["'self'", "https://gido-web.ooguy.com", "https://fetch-bot-fvty.onrender.com/"],
            scriptSrc: ["'self'", "https://gido-web.ooguy.com"],
            styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, "https://gido-web.ooguy.com"],
        },
    },
}));

app.get('', (req, res) => {
    res.setHeader('Content-Security-Policy', `style-src 'self' 'nonce-${res.locals.nonce}'`);
    const imagePath = path.join(__dirname, 'main-web/index.html');
    res.sendFile(imagePath);
});

app.get('/404.css', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/errors/404/404.css');
    res.sendFile(imagePath);
});


app.get('/Terms-of-Service', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/Terms-of-Service.html');
    res.sendFile(imagePath);
});

app.get('/Service-Policy', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/Service-Policy.html');
    res.sendFile(imagePath);
});

app.get('/aboutus', (req, res) => {
    const imagePath = path.join(__dirname, 'main-web/aboutus.html');
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

    if (!nickname || !email || !description) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    console.log('User ID:', userId); // Debugging line

    const isBanned = await checkIfBanned(userId);
    if (isBanned) {
        return res.status(401).json({
            message: 'You are banned from submitting requests. Please contact support on Discord for more info: https://discord.gg/Gq48UpPrXH',
        });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const embed = {
        content: `<@&1287531476035960904>`,
         embeds: [
        {
            title: "New Support Request!",
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
            timestamp: new Date().toISOString(),
            image: {
                url: "https://media.discordapp.net/attachments/1272578222164541460/1287239342984659005/standard_4.gif?ex=66f2cccf&is=66f17b4f&hm=2e6d26b6f1905e111e0f4ea29f5f24ce448fdf9b0cdeda9d021582d4546fdddc&="
            }
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

app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    if (err.status === 404) {
        if (req.accepts('html')) {
            res.status(404).sendFile(path.join(__dirname, 'main-web/errors/404/404.html'));
        } else {
            res.status(404).send('Resource not found');
        }
    } else {
        next(err);
    }
});

app.listen(PORT, () => console.log(`Online on: ${PORT}`));
