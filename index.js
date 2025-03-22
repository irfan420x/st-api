const express = require('express');
const fs = require('fs');
const path = require('path');

// Express app তৈরি
const app = express();
const PORT = process.env.PORT || 3000;

// JSON ডেটা লোড করার জন্য ফাংশন
function loadMessages() {
    const dataPath = path.join(__dirname, 'data.json');
    const rawData = fs.readFileSync(dataPath);
    return JSON.parse(rawData);
}

// Static files (public folder)
app.use(express.static('public'));

// API endpoint: মেসেজের জন্য রিপ্লাই পাওয়ার জন্য
app.get('/api/reply', (req, res) => {
    const userMessage = req.query.message; // ইউজারের মেসেজ
    const messages = loadMessages(); // ডেটা লোড করুন

    // মেসেজের জন্য রিপ্লাই খুঁজুন
    const reply = messages[userMessage] || "দুঃখিত, আমি এই মেসেজের উত্তর জানি না। 😔";

    res.json({ reply }); // রিপ্লাই রিটার্ন করুন
});

// সার্ভার শুরু করুন
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
