const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

// Load item details for item name lookup
const itemDetails = JSON.parse(fs.readFileSync(path.join(__dirname, '../itemdetails.json'), 'utf8'));
function getItemName(itemId) {
    return itemDetails.itemsById && itemDetails.itemsById[itemId]
        ? itemDetails.itemsById[itemId].name
        : `Item #${itemId}`;
}

// CONFIGURE THESE:
const TORN_API_KEY = process.env.TORN_API_KEY;
const SELECTIONS = 'log';
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'tornlogs';
const COLLECTION = 'logs';

async function fetchTornLogs() {
    const url = `https://api.torn.com/user/?selections=${SELECTIONS}&key=${TORN_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.log || {};
}

async function storeLogs(logs) {
    let client;
    let newCount = 0;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION);

        for (const [logId, entry] of Object.entries(logs)) {
            // Convert timestamp to Central Time date string (YYYY-MM-DD)
            const centralDate = entry.timestamp
                ? DateTime.fromSeconds(entry.timestamp, { zone: 'America/Chicago' }).toISODate()
                : null;
            // Lookup item name if item ID is present
            let itemId = null;
            if (entry.data && Array.isArray(entry.data.items) && entry.data.items[0] && entry.data.items[0].id) {
                itemId = entry.data.items[0].id.toString();
            } else if (entry.data && entry.data.item) {
                itemId = entry.data.item.toString();
            }
            const itemName = itemId ? getItemName(itemId) : null;
            // Build document to insert
            const docToInsert = { logId, ...entry, date: centralDate };
            if (itemName) docToInsert.itemName = itemName;
            // Upsert: only insert if not already present
            const result = await collection.updateOne(
                { logId: logId },
                { $setOnInsert: docToInsert },
                { upsert: true }
            );
            if (result.upsertedCount > 0) newCount++;
        }
    } catch (err) {
        console.error('MongoDB connection or operation failed:', err);
        throw err;
    } finally {
        if (client) await client.close();
    }
    return newCount;
}

async function main() {
    console.log('--- Torn log pull script started ---');
    const logs = await fetchTornLogs();
    const newCount = await storeLogs(logs);
    console.log(`Fetched ${Object.keys(logs).length} logs from Torn API.`);
    console.log(`Inserted ${newCount} new logs into MongoDB.`);
    console.log('--- Torn log pull script finished ---');
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
}); 