const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs_restructured';

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

// Determine event type and category based on log data
function determineEventType(log) {
    const category = log.category || '';
    const title = log.title || '';
    
    // Item market events
    if (category === 'Item market') {
        if (title.includes('sell')) return { type: 'item_market_sell', category: 'marketplace' };
        if (title.includes('add')) return { type: 'item_market_add', category: 'marketplace' };
        if (title.includes('buy')) return { type: 'item_market_buy', category: 'marketplace' };
        return { type: 'item_market_other', category: 'marketplace' };
    }
    
    // Travel events
    if (category === 'Travel') {
        if (title.includes('initiate')) return { type: 'travel_initiate', category: 'travel' };
        if (title.includes('abroad buy')) return { type: 'travel_item_buy', category: 'travel' };
        if (title.includes('rehab')) return { type: 'travel_rehab', category: 'travel' };
        return { type: 'travel_other', category: 'travel' };
    }
    
    // Stock events
    if (category === 'Stocks') {
        if (title.includes('buy')) return { type: 'stock_buy', category: 'stocks' };
        if (title.includes('sell')) return { type: 'stock_sell', category: 'stocks' };
        return { type: 'stock_other', category: 'stocks' };
    }
    
    // Crime events
    if (category === 'Crimes') {
        if (title.includes('success') && title.includes('item gain')) return { type: 'crime_success_item_gain', category: 'crimes' };
        if (title.includes('success') && title.includes('burglary')) return { type: 'crime_success_burglary', category: 'crimes' };
        if (title.includes('success')) return { type: 'crime_success', category: 'crimes' };
        if (title.includes('fail')) return { type: 'crime_fail', category: 'crimes' };
        return { type: 'crime_other', category: 'crimes' };
    }
    
    // Hospital events
    if (category === 'Hospital') {
        return { type: 'hospital', category: 'medical' };
    }
    
    // Company events
    if (category === 'Company') {
        return { type: 'company', category: 'work' };
    }
    
    // Faction events
    if (category === 'Faction') {
        return { type: 'faction', category: 'social' };
    }
    
    // Default
    return { type: category.toLowerCase().replace(/\s+/g, '_'), category: 'other' };
}

// Restructure log data into the new format
function restructureLogData(log, { locationMap, itemMap, stockMap }) {
    const eventType = determineEventType(log);
    const timestamp = parseInt(log.timestamp);
    const date = new Date(timestamp * 1000);
    
    const restructuredLog = {
        log_id: parseInt(log.logId) || null,
        event: {
            type: eventType.type,
            category: eventType.category,
            title: log.title || '',
            timestamp: timestamp,
            date: date.toISOString(),
            original_category: log.category || '',
            original_data: log.data || {}
        },
        metadata: {
            collection_type: log.collectionType || 'automatic',
            collected_at: new Date().toISOString(),
            processed_time: {
                central: toCentralTime(timestamp),
                day_of_week: date.toLocaleDateString('en-US', { weekday: 'long' }),
                month: date.toLocaleDateString('en-US', { month: 'long' }),
                year: date.getFullYear()
            }
        }
    };
    
    // Add specific data based on event type
    switch (eventType.type) {
        case 'item_market_sell':
        case 'item_market_add':
        case 'item_market_buy':
            if (log.data && log.data.items && Array.isArray(log.data.items)) {
                const item = log.data.items[0]; // Assuming single item for now
                restructuredLog.item_name = itemMap[item.id] || `Unknown Item (${item.id})`;
                restructuredLog.quantity = item.qty || 1;
                restructuredLog.transaction = {
                    buyer_id: log.data.buyer || null,
                    is_anonymous: log.data.anonymous === 1,
                    total_cost: log.data.cost_total || null,
                    marketplace_fee: log.data.fee || null,
                    cost_per_item: log.data.cost_each || log.data.price || null,
                    item_details: {
                        item_id: item.id,
                        unique_id: item.uid
                    }
                };
            }
            break;
            
        case 'travel_initiate':
            if (log.data) {
                restructuredLog.travel = {
                    origin: {
                        id: log.data.origin,
                        name: locationMap[log.data.origin] || `Unknown Location (${log.data.origin})`
                    },
                    destination: {
                        id: log.data.destination,
                        name: locationMap[log.data.destination] || `Unknown Location (${log.data.destination})`
                    },
                    method: log.data.travel_method || 'unknown',
                    duration: log.data.duration || null
                };
            }
            break;
            
        case 'travel_item_buy':
            if (log.data) {
                restructuredLog.item_name = itemMap[log.data.item] || `Unknown Item (${log.data.item})`;
                restructuredLog.quantity = log.data.quantity || 1;
                restructuredLog.transaction = {
                    total_cost: log.data.cost_total || null,
                    cost_per_item: log.data.cost_each || null,
                    area: {
                        id: log.data.area,
                        name: locationMap[log.data.area] || `Unknown Location (${log.data.area})`
                    }
                };
            }
            break;
            
        case 'stock_buy':
        case 'stock_sell':
            if (log.data) {
                restructuredLog.stock_name = stockMap[log.data.stock] || `Unknown Stock (${log.data.stock})`;
                restructuredLog.transaction = {
                    stock_id: log.data.stock,
                    amount: log.data.amount || null,
                    worth: log.data.worth || null,
                    price_per_share: log.data.price || null
                };
            }
            break;
            
        case 'crime_success_item_gain':
            if (log.data && log.data.items_gained) {
                restructuredLog.crime = {
                    action: log.data.crime_action || 'unknown',
                    outcome: log.data.outcome || null,
                    nerve_cost: log.data.nerve || null,
                    items_gained: Object.keys(log.data.items_gained).map(itemId => ({
                        item_id: parseInt(itemId),
                        item_name: itemMap[itemId] || `Unknown Item (${itemId})`,
                        quantity: log.data.items_gained[itemId]
                    }))
                };
            }
            break;
            
        case 'crime_success_burglary':
        case 'crime_success':
        case 'crime_fail':
            if (log.data) {
                restructuredLog.crime = {
                    action: log.data.crime_action || 'unknown',
                    outcome: log.data.outcome || null,
                    nerve_cost: log.data.nerve || null,
                    target: log.data.target || null
                };
            }
            break;
            
        default:
            // For other event types, preserve the original data structure
            if (log.data) {
                restructuredLog.data = log.data;
            }
    }
    
    return restructuredLog;
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

async function restructureExistingLogs() {
    let client;
    
    try {
        console.log('🚀 Starting logs restructuring...');
        
        // Load lookup data
        loadLookupData();
        
        // Connect to MongoDB
        client = await connectToMongoDB();
        const db = client.db(DATABASE_NAME);
        
        // Get the old collection
        const oldCollection = db.collection('user_logs');
        const newCollection = db.collection(COLLECTION_NAME);
        
        // Get all logs from the old collection
        const oldLogs = await oldCollection.find({}).toArray();
        console.log(`📊 Found ${oldLogs.length} logs to restructure`);
        
        if (oldLogs.length === 0) {
            console.log('📭 No logs found to restructure');
            return;
        }
        
        // Create lookup maps
        const lookupMaps = createLookupMaps();
        
        // Restructure and insert logs
        let processedCount = 0;
        for (const log of oldLogs) {
            const restructuredLog = restructureLogData(log, lookupMaps);
            
            // Check if log already exists in new collection
            const existingLog = await newCollection.findOne({
                log_id: restructuredLog.log_id,
                'event.timestamp': restructuredLog.event.timestamp
            });
            
            if (!existingLog) {
                await newCollection.insertOne(restructuredLog);
                processedCount++;
            }
            
            if (processedCount % 10 === 0) {
                console.log(`📝 Restructured ${processedCount}/${oldLogs.length} logs...`);
            }
        }
        
        console.log(`✅ Successfully restructured ${processedCount} logs`);
        
        // Create indexes for the new collection
        await newCollection.createIndex({ log_id: 1, 'event.timestamp': 1 }, { unique: true });
        await newCollection.createIndex({ 'event.timestamp': -1 });
        await newCollection.createIndex({ 'event.type': 1 });
        await newCollection.createIndex({ 'event.category': 1 });
        await newCollection.createIndex({ 'metadata.processed_time.day_of_week': 1 });
        await newCollection.createIndex({ 'metadata.processed_time.month': 1 });
        await newCollection.createIndex({ 'metadata.processed_time.year': 1 });
        
        console.log('✅ Indexes created for new collection');
        
        // Show sample restructured logs
        const sampleLogs = await newCollection
            .find({})
            .sort({ 'event.timestamp': -1 })
            .limit(5)
            .toArray();
        
        console.log('\n📋 Sample restructured logs:');
        sampleLogs.forEach((log, index) => {
            console.log(`\n${index + 1}. ${log.event.title} - ${log.metadata.processed_time.central}`);
            console.log(`   Type: ${log.event.type}, Category: ${log.event.category}`);
            
            if (log.item_name) {
                console.log(`   Item: ${log.item_name} (Qty: ${log.quantity})`);
            }
            
            if (log.travel) {
                console.log(`   Travel: ${log.travel.origin.name} → ${log.travel.destination.name}`);
            }
            
            if (log.stock_name) {
                console.log(`   Stock: ${log.stock_name}`);
            }
            
            if (log.crime) {
                console.log(`   Crime: ${log.crime.action}`);
                if (log.crime.items_gained) {
                    log.crime.items_gained.forEach(item => {
                        console.log(`     Gained: ${item.item_name} (Qty: ${item.quantity || 'N/A'})`);
                    });
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error restructuring logs:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    restructureExistingLogs().catch(console.error);
}

module.exports = { restructureExistingLogs, restructureLogData }; 