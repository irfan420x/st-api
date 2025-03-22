const express = require('express');
const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity'); // ফজি ম্যাচিং লাইব্রেরি

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
    return message.trim().toLowerCase().replace(/[?.,!]/g, ''); // স্পেস, কেস, এবং বিশেষ চিহ্ন রিমুভ করুন
}

// API endpoint: মেসেজের জন্য রিপ্লাই পাওয়ার জন্য
app.get('/api/reply', (req, res) => {
    const { message, lang } = req.query; // ইউজারের মেসেজ এবং ভাষা
    if (!message || !lang) {
        return res.status(400).json({ error: "Message and language are required." });
    }

    // মেসেজ ক্লিন করুন
    const cleanMessageText = cleanMessage(message);

    // ভাষা অনুযায়ী ডেটা লোড করুন
    const filePath = lang === 'bangla' ? 'data/bangla.json' : 'data/english.json';
    const messages = loadMessages(filePath);

    // শিখানো ডেটা লোড করুন
    const teachData = loadMessages('data/teach.json');

    // রিপ্লাই খুঁজুন
    let reply = messages[cleanMessageText] || teachData[cleanMessageText];

    // যদি রিপ্লাই না পাওয়া যায়, ফজি ম্যাচিং ব্যবহার করুন
    if (!reply) {
        const allKeys = Object.keys({ ...messages, ...teachData }); // সবগুলো কী নিন
        const matches = stringSimilarity.findBestMatch(cleanMessageText, allKeys); // ফজি ম্যাচিং
        if (matches.bestMatch.rating > 0.5) { // যদি ম্যাচের রেটিং ৫০% এর বেশি হয়
            reply = messages[matches.bestMatch.target] || teachData[matches.bestMatch.target];
        } else {
            reply = "দুঃখিত, আমি এই মেসেজের উত্তর জানি না। 😔";
        }
    }

    res.json({ reply });
});

// API endpoint: নতুন প্রশ্ন-উত্তর শিখানোর জন্য
app.post('/api/learn', (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ error: "Question and answer are required." });
    }

    // মেসেজ ক্লিন করুন
    const cleanQuestion = cleanMessage(question);

    // শিখানো ডেটা লোড করুন
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
