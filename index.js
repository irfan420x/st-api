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

// হোম পেজ (public/index.html দেখাবে)
app.use(express.static('public'));

// API endpoint: রোমান্টিক মেসেজ পাওয়ার জন্য
app.get('/api/messages', (req, res) => {
    try {
        const messages = loadMessages(); // ডেটা লোড করুন
        res.json(messages); // মেসেজগুলো রিটার্ন করুন
    } catch (error) {
        console.error('Error loading messages:', error);
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

// সার্ভার শুরু করুন
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
