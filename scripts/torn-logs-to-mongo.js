const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const { DateTime } = require('luxon');

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
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    for (const [logId, entry] of Object.entries(logs)) {
        // Convert timestamp to Central Time date string (YYYY-MM-DD)
        const centralDate = entry.timestamp
            ? DateTime.fromSeconds(entry.timestamp, { zone: 'America/Chicago' }).toISODate()
            : null;
        // Upsert: only insert if not already present
        await collection.updateOne(
            { logId: logId },
            { $setOnInsert: { logId, ...entry, date: centralDate } },
            { upsert: true }
        );
    }
    await client.close();
}

async function main() {
    const logs = await fetchTornLogs();
    await storeLogs(logs);
    console.log(`Stored ${Object.keys(logs).length} logs.`);
}

main().catch(console.error); 