const express = require('express');
const fs = require('fs');
const path = require('path');
const FuzzySet = require('fuzzyset.js'); // ফজি ম্যাচিং
const phonetic = require('phonetic'); // ফোনেটিক ম্যাচিং
const stemmer = require('stemmer'); // স্টেমিং

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

// ফোনেটিক কী তৈরি করার জন্য ফাংশন
function getPhoneticKey(text) {
    return phonetic.soundex(text); // ফোনেটিক কী তৈরি করুন
}

// স্টেমিং করার জন্য ফাংশন
function getStemmedText(text) {
    return text.split(' ').map(word => stemmer(word)).join(' '); // শব্দের মূল অংশ বের করুন
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

    // সবগুলো কী নিন
    const allKeys = Object.keys({ ...messages, ...teachData });

    // FuzzySet ব্যবহার করে ফজি ম্যাচিং সেট করুন
    const fuzzySet = FuzzySet(allKeys);
    const match = fuzzySet.get(cleanMessageText); // ফজি ম্যাচিং

    let reply;
    if (match && match[0][0] > 0.5) { // যদি ম্যাচের স্কোর ৫০% এর বেশি হয়
        const matchedKey = match[0][1];
        reply = messages[matchedKey] || teachData[matchedKey];
    } else {
        // ফোনেটিক ম্যাচিং চেষ্টা করুন
        const phoneticKey = getPhoneticKey(cleanMessageText);
        const phoneticMatch = allKeys.find(key => getPhoneticKey(key) === phoneticKey);
        if (phoneticMatch) {
            reply = messages[phoneticMatch] || teachData[phoneticMatch];
        } else {
            // স্টেমিং চেষ্টা করুন
            const stemmedText = getStemmedText(cleanMessageText);
            const stemmedMatch = allKeys.find(key => getStemmedText(key) === stemmedText);
            if (stemmedMatch) {
                reply = messages[stemmedMatch] || teachData[stemmedMatch];
            } else {
                reply = "দুঃখিত, আমি এই মেসেজের উত্তর জানি না। 😔";
            }
        }
    }

    res.json({ reply });
});

// API endpoint: নতুন প্রশ্ন-উত্তর শিখানোর জন্য
app.post('/api/learn', (req, res) => {
    const { question, answer, lang } = req.body;
    if (!question || !answer || !lang) {
        return res.status(400).json({ error: "Question, answer, and language are required." });
    }

    // মেসেজ ক্লিন করুন
    const cleanQuestion = cleanMessage(question);

    // ভাষা অনুযায়ী ডেটা লোড করুন
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
