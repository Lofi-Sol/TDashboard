const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
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
    
    // Enhance item logs (single item)
    if (log.data && log.data.item && itemMap[log.data.item]) {
        enhancedLog.data.itemName = itemMap[log.data.item];
    }
    
    // Enhance item market logs (items array)
    if (log.data && log.data.items && Array.isArray(log.data.items)) {
        enhancedLog.data.items = log.data.items.map(item => ({
            ...item,
            itemName: itemMap[item.id] || `Unknown Item (${item.id})`
        }));
    }
    
    // Enhance crime logs with item names
    if (log.category === 'Crimes' && log.data && log.data.items_gained) {
        const enhancedItemsGained = {};
        Object.keys(log.data.items_gained).forEach(itemId => {
            const itemName = itemMap[itemId] || `Unknown Item (${itemId})`;
            enhancedItemsGained[itemId] = {
                quantity: log.data.items_gained[itemId],
                itemName: itemName
            };
        });
        enhancedLog.data.items_gained = enhancedItemsGained;
    }
    
    // Enhance stock logs
    if (log.category === 'Stocks' && log.data && log.data.stock && stockMap[log.data.stock]) {
        enhancedLog.data.stockName = stockMap[log.data.stock];
    }
    
    return enhancedLog;
}

async function enhanceExistingLogs() {
    let client;
    
    try {
        console.log('🚀 Starting enhancement of existing logs...');
        
        // Load lookup data
        loadLookupData();
        
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Get all logs to re-enhance with new item name improvements
        const logsToEnhance = await collection
            .find({})
            .toArray();
        
        console.log(`📊 Found ${logsToEnhance.length} logs to enhance`);
        
        if (logsToEnhance.length === 0) {
            console.log('✅ All logs are already enhanced');
            return;
        }
        
        // Create lookup maps
        const lookupMaps = createLookupMaps();
        
        // Enhance and update logs
        let updatedCount = 0;
        for (const log of logsToEnhance) {
            const enhancedLog = enhanceLogData(log, lookupMaps);
            
            // Update the log in the database
            await collection.updateOne(
                { _id: log._id },
                { $set: enhancedLog }
            );
            
            updatedCount++;
            
            if (updatedCount % 10 === 0) {
                console.log(`📝 Enhanced ${updatedCount}/${logsToEnhance.length} logs...`);
            }
        }
        
        console.log(`✅ Successfully enhanced ${updatedCount} logs`);
        
        // Show some examples of enhanced logs
        const sampleEnhancedLogs = await collection
            .find({ centralTime: { $exists: true } })
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
        
        console.log('\n📋 Sample enhanced logs:');
        sampleEnhancedLogs.forEach((log, index) => {
            console.log(`\n${index + 1}. [${log.logId}] ${log.title} - ${log.centralTime}`);
            console.log(`   Category: ${log.category}`);
            
            if (log.category === 'Travel' && log.data) {
                console.log(`   Travel: ${log.data.originName || log.data.origin} → ${log.data.destinationName || log.data.destination}`);
            }
            
            if (log.data && log.data.itemName) {
                console.log(`   Item: ${log.data.itemName} (ID: ${log.data.item})`);
            }
            
            if (log.category === 'Stocks' && log.data && log.data.stockName) {
                console.log(`   Stock: ${log.data.stockName} (ID: ${log.data.stock})`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error enhancing logs:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    enhanceExistingLogs().catch(console.error);
}

module.exports = { enhanceExistingLogs }; 