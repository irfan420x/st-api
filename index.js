const express = require('express');
const fs = require('fs');
const path = require('path');

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

// JSON ডেটা সেভ করার জন্য ফাংশন
function saveMessages(filePath, data) {
    const dataPath = path.join(__dirname, filePath);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

// API endpoint: মেসেজের জন্য রিপ্লাই পাওয়ার জন্য
app.get('/api/reply', (req, res) => {
    const { message, lang } = req.query; // ইউজারের মেসেজ এবং ভাষা
    if (!message || !lang) {
        return res.status(400).json({ error: "Message and language are required." });
    }

    // মেসেজ ক্লিন করুন: স্পেস এবং প্রশ্নবোধক চিহ্ন (?) রিমুভ করুন
    const cleanMessage = message.trim().replace(/\?$/, '');

    // ভাষা অনুযায়ী ডেটা লোড করুন
    const filePath = lang === 'bangla' ? 'data/bangla.json' : 'data/english.json';
    const messages = loadMessages(filePath);

    // শিখানো ডেটা লোড করুন
    const teachData = loadMessages('data/teach.json');

    // রিপ্লাই খুঁজুন
    let reply = messages[cleanMessage] || teachData[cleanMessage];
    if (!reply) {
        reply = "দুঃখিত, আমি এই মেসেজের উত্তর জানি না। 😔";
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
    const cleanQuestion = question.trim().replace(/\?$/, '');

    // শিখানো ডেটা লোড করুন
    const teachData = loadMessages('data/teach.json');

    // নতুন প্রশ্ন-উত্তর যোগ করুন
    teachData[cleanQuestion] = answer;

    // ডেটা সেভ করুন
    saveMessages('data/teach.json', teachData);

    res.json({ success: true, message: "New question-answer learned successfully!" });
});

// সার্ভার শুরু করুন
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
