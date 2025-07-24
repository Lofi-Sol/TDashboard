const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs';

async function connectToMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        return client;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}

async function getLatestLogTimestamp(db) {
    try {
        const collection = db.collection(COLLECTION_NAME);
        const latestLog = await collection
            .find({})
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();
        
        return latestLog.length > 0 ? latestLog[0].timestamp : null;
    } catch (error) {
        console.error('Error getting latest log timestamp:', error);
        return null;
    }
}

async function fetchTornLogs(fromTimestamp = null) {
    if (!TORN_API_KEY) {
        throw new Error('TORN_API_KEY not found in environment variables');
    }

    try {
        let url = `https://api.torn.com/v2/user/?selections=log&key=${TORN_API_KEY}`;
        if (fromTimestamp) {
            url += `&from=${fromTimestamp}`;
        }

        console.log(`🔍 Fetching logs from Torn API${fromTimestamp ? ` from timestamp ${fromTimestamp}` : ''}...`);
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(`Torn API Error: ${data.error}`);
        }

        return data.log || {};
    } catch (error) {
        console.error('Error fetching Torn logs:', error);
        throw error;
    }
}

async function processAndStoreLogs(db, logsData) {
    try {
        const collection = db.collection(COLLECTION_NAME);
        const logs = Object.values(logsData);
        
        if (logs.length === 0) {
            console.log('📭 No new logs to process');
            return 0;
        }

        console.log(`📊 Processing ${logs.length} logs...`);

        // Prepare logs for insertion with additional metadata
        const processedLogs = logs.map(log => ({
            ...log,
            logId: parseInt(log.logId),
            timestamp: parseInt(log.timestamp),
            date: new Date(parseInt(log.timestamp) * 1000),
            dayOfWeek: new Date(parseInt(log.timestamp) * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
            month: new Date(parseInt(log.timestamp) * 1000).toLocaleDateString('en-US', { month: 'long' }),
            year: new Date(parseInt(log.timestamp) * 1000).getFullYear(),
            collectionType: 'automatic',
            collectedAt: new Date()
        }));

        // Check for duplicates and insert only new logs
        let insertedCount = 0;
        for (const log of processedLogs) {
            // Check if log already exists (using logId and timestamp as unique identifier)
            const existingLog = await collection.findOne({
                logId: log.logId,
                timestamp: log.timestamp
            });

            if (!existingLog) {
                await collection.insertOne(log);
                insertedCount++;
            }
        }

        console.log(`✅ Successfully inserted ${insertedCount} new logs`);
        return insertedCount;
    } catch (error) {
        console.error('Error processing and storing logs:', error);
        throw error;
    }
}

async function createIndexes(db) {
    try {
        const collection = db.collection(COLLECTION_NAME);
        
        // Create indexes for better performance
        await collection.createIndex({ logId: 1, timestamp: 1 }, { unique: true });
        await collection.createIndex({ timestamp: -1 });
        await collection.createIndex({ logId: 1 });
        await collection.createIndex({ dayOfWeek: 1 });
        await collection.createIndex({ month: 1 });
        await collection.createIndex({ year: 1 });
        
        console.log('✅ Database indexes created/verified');
    } catch (error) {
        console.error('Error creating indexes:', error);
        // Don't throw error for index creation failures
    }
}

async function main() {
    let client;
    
    try {
        console.log('🚀 Starting Torn City logs collection...');
        
        // Connect to MongoDB
        client = await connectToMongoDB();
        const db = client.db(DATABASE_NAME);
        
        // Create/verify indexes
        await createIndexes(db);
        
        // Get the latest log timestamp from our database
        const latestTimestamp = await getLatestLogTimestamp(db);
        
        // Fetch logs from Torn API
        const logsData = await fetchTornLogs(latestTimestamp);
        
        // Process and store logs
        const insertedCount = await processAndStoreLogs(db, logsData);
        
        if (insertedCount > 0) {
            console.log(`🎉 Successfully collected ${insertedCount} new logs`);
        } else {
            console.log('📭 No new logs found - all up to date');
        }
        
        // Get collection stats
        const totalLogs = await db.collection(COLLECTION_NAME).countDocuments();
        console.log(`📈 Total logs in database: ${totalLogs.toLocaleString()}`);
        
    } catch (error) {
        console.error('❌ Error in main process:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main }; 