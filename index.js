const { Telegraf } = require('telegraf');
const axios = require('axios');
const multer = require('multer');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Replace with your bot token
const BOT_TOKEN = '7373065530:AAFzbcTxBNJ0GQ8SCOONEc8rM24fE1lQcLs';
const bot = new Telegraf(BOT_TOKEN);

// Set up Express for serving files
const app = express();
const PORT = 3000;

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve files from the uploads folder
app.use('/files', express.static('uploads'));

// Start the Express server
app.listen(PORT, () => {
    console.log(`File server running at: http://localhost:${PORT}`);
});

// Maximum file size: 1 GB
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB

// Handle document uploads
bot.on('document', async (ctx) => {
    try {
        const fileSize = ctx.message.document.file_size;
        const fileName = ctx.message.document.file_name;

        // Check file size
        if (fileSize > MAX_FILE_SIZE) {
            return ctx.reply(`The file is too large! Please upload a file smaller than 1 GB.`);
        }

        const fileId = ctx.message.document.file_id;

        // Get file info from Telegram
        const fileInfo = await ctx.telegram.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
        console.log('File URL:', fileUrl);

        // Download the file
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        const filePath = `uploads/${fileName}`;
        const fileStream = fs.createWriteStream(filePath);

        response.data.pipe(fileStream);

        fileStream.on('finish', () => {
            const link = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/files/${fileName}`;
            ctx.reply(`Here is your public download link: ${link}`);

            // Schedule file deletion in 1 hour
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete file ${fileName}:`, err);
                    } else {
                        console.log(`File ${fileName} deleted after 1 hour.`);
                    }
                });
            }, 60 * 60 * 1000); // 1 hour
        });

        fileStream.on('error', (err) => {
            console.error('Error while saving the file:', err);
            ctx.reply('An error occurred while saving your file. Please try again.');
        });
    } catch (error) {
        console.error('Error processing the file:', error);
        ctx.reply('Failed to process the file. Please try again.');
    }
});

// Bot start command
bot.start((ctx) => {
    ctx.reply('Welcome! Send me a file, and I’ll generate a public link for it. Files will be deleted after 1 hour.');
});

// Start the bot
bot.launch();
console.log('Bot is running...');