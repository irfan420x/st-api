const express = require('express');
const fs = require('fs');
const path = require('path');
const natural = require('natural'); // স্টেমিং ও ফজি ম্যাচিং
const nspell = require('nspell'); // বানান সংশোধন
const dictionary = require('dictionary-en'); // ইংরেজির অভিধান
const bengaliStemmer = require('bengali-stemmer'); // বাংলা স্টেমিং

// Express app তৈরি
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());
app.use(express.static('public'));

// JSON ডেটা লোড করার জন্য ফাংশন
function loadMessages(filePath) {
    const dataPath = path.join(__dirname, filePath);
    if (!fs.existsSync(dataPath)) {
        return {}; // যদি ফাইল না থাকে, খালি অবজেক্ট রিটার্ন করুন
    }
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

// টেক্সট ক্লিন করার জন্য ফাংশন
function cleanMessage(message) {
    return message.trim().toLowerCase().replace(/[?.,!]/g, '');
}

// বানান সংশোধনের জন্য ফাংশন (ইংরেজি)
async function correctSpelling(text) {
    return new Promise((resolve) => {
        dictionary((err, dict) => {
            if (err) throw err;
            const spell = nspell(dict);
            const words = text.split(' ');
            const correctedWords = words.map(word => spell.correct(word) ? word : spell.suggest(word)[0] || word);
            resolve(correctedWords.join(' '));
        });
    });
}

// স্টেমিং করার জন্য ফাংশন (বাংলা)
function getStemmedText(text, lang) {
    if (lang === 'bangla') {
        return text.split(' ').map(word => bengaliStemmer.stem(word)).join(' ');
    } else {
        return text.split(' ').map(word => natural.PorterStemmer.stem(word)).join(' ');
    }
}

// API endpoint: মেসেজের জন্য রিপ্লাই পাওয়ার জন্য
app.get('/api/reply', async (req, res) => {
    const { message, lang } = req.query;
    if (!message || !lang) {
        return res.status(400).json({ error: "Message and language are required." });
    }

    let cleanMessageText = cleanMessage(message);

    // বানান সংশোধন করা (শুধু ইংরেজির জন্য)
    if (lang === 'english') {
        cleanMessageText = await correctSpelling(cleanMessageText);
    }

    // ভাষা অনুযায়ী ডেটা লোড করুন
    const filePath = lang === 'bangla' ? 'data/bangla.json' : 'data/english.json';
    const messages = loadMessages(filePath);
    const teachData = loadMessages('data/teach.json');

    // সব প্রশ্ন তালিকা নিন
    const allKeys = Object.keys({ ...messages, ...teachData });

    // স্টেমিং করা টেক্সট
    const stemmedText = getStemmedText(cleanMessageText, lang);

    // স্টেমিং করা টেক্সটের সাথে মিল খুঁজুন
    const match = allKeys.find(key => getStemmedText(key, lang) === stemmedText);

    let reply = match ? messages[match] || teachData[match] : "দুঃখিত, আমি এই মেসেজের উত্তর জানি না। 😔";

    res.json({ reply });
});

// API endpoint: নতুন প্রশ্ন-উত্তর শিখানোর জন্য
app.post('/api/learn', (req, res) => {
    const { question, answer, lang } = req.body;
    if (!question || !answer || !lang) {
        return res.status(400).json({ error: "Question, answer, and language are required." });
    }

    const cleanQuestion = cleanMessage(question);
    const filePath = lang === 'bangla' ? 'data/bangla.json' : 'data/english.json';
    const teachData = loadMessages('data/teach.json');

    // নতুন প্রশ্ন-উত্তর যোগ করুন
    teachData[cleanQuestion] = answer;

    // ডেটা সেভ করুন
    saveMessages('data/teach.json', teachData);

    res.json({ success: true, message: "New question-answer learned successfully!" });
});

// JSON ডেটা সেভ করার জন্য ফাংশন
function saveMessages(filePath, data) {
    const dataPath = path.join(__dirname, filePath);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

// সার্ভার শুরু করুন
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
