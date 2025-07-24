const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs';

// Load lookup data
let travelData = {};
let itemDetails = {};
let stockData = {};

function loadLookupData() {
    try {
        // Load travel data
        const travelDataPath = path.join(__dirname, '../travel-data.json');
        if (fs.existsSync(travelDataPath)) {
            travelData = JSON.parse(fs.readFileSync(travelDataPath, 'utf8'));
            console.log('✅ Loaded travel data');
        }

        // Load item details
        const itemDetailsPath = path.join(__dirname, '../itemdetails.json');
        if (fs.existsSync(itemDetailsPath)) {
            itemDetails = JSON.parse(fs.readFileSync(itemDetailsPath, 'utf8'));
            console.log('✅ Loaded item details');
        }

        // Load stock data
        const stockDataPath = path.join(__dirname, '../data/latest-stock-data.json');
        if (fs.existsSync(stockDataPath)) {
            stockData = JSON.parse(fs.readFileSync(stockDataPath, 'utf8'));
            console.log('✅ Loaded stock data');
        }
    } catch (error) {
        console.error('❌ Error loading lookup data:', error);
    }
}

// Create lookup maps for faster access
function createLookupMaps() {
    const locationMap = {};
    const itemMap = {};
    const stockMap = {};

    // Create location lookup map
    if (travelData.locations) {
        travelData.locations.forEach(location => {
            locationMap[location.id] = location.name;
        });
    }

    // Create item lookup map
    if (itemDetails.categories) {
        Object.values(itemDetails.categories).forEach(category => {
            if (Array.isArray(category)) {
                category.forEach(item => {
                    itemMap[item.id] = item.name;
                });
            }
        });
    }

    // Create stock lookup map
    if (stockData) {
        Object.values(stockData).forEach(stock => {
            if (stock.stock_id && stock.name) {
                stockMap[stock.stock_id] = stock.name;
            }
        });
    }

    return { locationMap, itemMap, stockMap };
}

// Convert UTC timestamp to Central Time
function toCentralTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Enhance log data with readable names and Central Time
function enhanceLogData(log, { locationMap, itemMap, stockMap }) {
    const enhancedLog = { ...log };
    
    // Add Central Time
    enhancedLog.centralTime = toCentralTime(log.timestamp);
    
    // Enhance travel logs
    if (log.category === 'Travel' && log.data) {
        if (log.data.origin && locationMap[log.data.origin]) {
            enhancedLog.data.originName = locationMap[log.data.origin];
        }
        if (log.data.destination && locationMap[log.data.destination]) {
            enhancedLog.data.destinationName = locationMap[log.data.destination];
        }
        if (log.data.area && locationMap[log.data.area]) {
            enhancedLog.data.areaName = locationMap[log.data.area];
        }
    }
    
    // Enhance item logs
    if (log.data && log.data.item && itemMap[log.data.item]) {
        enhancedLog.data.itemName = itemMap[log.data.item];
    }
    
    // Enhance stock logs
    if (log.category === 'Stocks' && log.data && log.data.stock && stockMap[log.data.stock]) {
        enhancedLog.data.stockName = stockMap[log.data.stock];
    }
    
    return enhancedLog;
}

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

        // Create lookup maps
        const lookupMaps = createLookupMaps();

        // Prepare logs for insertion with additional metadata and enhancements
        const processedLogs = logs.map(log => {
            const enhancedLog = enhanceLogData(log, lookupMaps);
            
            return {
                ...enhancedLog,
                logId: parseInt(log.logId),
                timestamp: parseInt(log.timestamp),
                date: new Date(parseInt(log.timestamp) * 1000),
                dayOfWeek: new Date(parseInt(log.timestamp) * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
                month: new Date(parseInt(log.timestamp) * 1000).toLocaleDateString('en-US', { month: 'long' }),
                year: new Date(parseInt(log.timestamp) * 1000).getFullYear(),
                collectionType: 'automatic',
                collectedAt: new Date()
            };
        });

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
        await collection.createIndex({ category: 1 });
        
        console.log('✅ Database indexes created/verified');
    } catch (error) {
        console.error('Error creating indexes:', error);
        // Don't throw error for index creation failures
    }
}

async function main() {
    let client;
    
    try {
        console.log('🚀 Starting enhanced Torn City logs collection...');
        
        // Load lookup data
        loadLookupData();
        
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
            console.log(`🎉 Successfully collected ${insertedCount} new logs with enhanced data`);
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

module.exports = { main, enhanceLogData, createLookupMaps }; 