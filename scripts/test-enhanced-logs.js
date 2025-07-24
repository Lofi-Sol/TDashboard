const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs';

async function testEnhancedLogs() {
    let client;
    
    try {
        console.log('🧪 Testing enhanced logs collection...');
        
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Check if collection exists and has data
        const totalLogs = await collection.countDocuments();
        console.log(`📊 Total logs in database: ${totalLogs.toLocaleString()}`);
        
        if (totalLogs > 0) {
            // Get sample logs with different categories
            const sampleLogs = await collection
                .find({})
                .sort({ timestamp: -1 })
                .limit(10)
                .toArray();
            
            console.log('\n📋 Sample enhanced logs:');
            sampleLogs.forEach((log, index) => {
                console.log(`\n${index + 1}. [${log.logId}] ${log.title} - ${log.centralTime || 'No Central Time'}`);
                console.log(`   Category: ${log.category}`);
                console.log(`   Day: ${log.dayOfWeek}, Month: ${log.month}, Year: ${log.year}`);
                
                // Show enhanced data for different log types
                if (log.category === 'Travel' && log.data) {
                    console.log(`   Travel: ${log.data.originName || log.data.origin} → ${log.data.destinationName || log.data.destination}`);
                    if (log.data.areaName) {
                        console.log(`   Area: ${log.data.areaName}`);
                    }
                }
                
                            if (log.data && log.data.itemName) {
                console.log(`   Item: ${log.data.itemName} (ID: ${log.data.item})`);
            }
            
            // Show enhanced item market logs
            if (log.data && log.data.items && Array.isArray(log.data.items)) {
                log.data.items.forEach((item, idx) => {
                    console.log(`   Item ${idx + 1}: ${item.itemName || `Unknown Item (${item.id})`} (ID: ${item.id}, Qty: ${item.qty})`);
                });
            }
            
            // Show enhanced crime logs
            if (log.category === 'Crimes' && log.data && log.data.items_gained) {
                console.log(`   Crime: ${log.data.crime_action || 'Unknown crime'}`);
                Object.keys(log.data.items_gained).forEach(itemId => {
                    const itemData = log.data.items_gained[itemId];
                    if (itemData.itemName) {
                        console.log(`   Gained: ${itemData.itemName} (ID: ${itemId}, Qty: ${itemData.quantity})`);
                    } else {
                        console.log(`   Gained: Unknown Item (ID: ${itemId}, Qty: ${itemData.quantity})`);
                    }
                });
            }
            
            if (log.category === 'Stocks' && log.data && log.data.stockName) {
                console.log(`   Stock: ${log.data.stockName} (ID: ${log.data.stock})`);
            }
            });
            
            // Get logs by category
            const categoryStats = await collection.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]).toArray();
            
            console.log('\n📊 Logs by category:');
            categoryStats.forEach(stat => {
                console.log(`  ${stat._id}: ${stat.count.toLocaleString()}`);
            });
            
            // Get enhanced travel logs
            const travelLogs = await collection
                .find({ category: 'Travel' })
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
            
            if (travelLogs.length > 0) {
                console.log('\n✈️ Enhanced travel logs:');
                travelLogs.forEach((log, index) => {
                    console.log(`  ${index + 1}. ${log.data.originName || log.data.origin} → ${log.data.destinationName || log.data.destination}`);
                    console.log(`     Time: ${log.centralTime}, Method: ${log.data.travel_method || 'Unknown'}`);
                });
            }
            
            // Get enhanced item logs
            const itemLogs = await collection
                .find({ 'data.itemName': { $exists: true } })
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
            
            if (itemLogs.length > 0) {
                console.log('\n🛍️ Enhanced item logs:');
                itemLogs.forEach((log, index) => {
                    console.log(`  ${index + 1}. ${log.data.itemName} (ID: ${log.data.item})`);
                    console.log(`     Quantity: ${log.data.quantity || 'N/A'}, Cost: $${log.data.cost_total || log.data.cost_each || 'N/A'}`);
                    console.log(`     Time: ${log.centralTime}`);
                });
            }
            
            // Get enhanced stock logs
            const stockLogs = await collection
                .find({ 'data.stockName': { $exists: true } })
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
            
            if (stockLogs.length > 0) {
                console.log('\n📈 Enhanced stock logs:');
                stockLogs.forEach((log, index) => {
                    console.log(`  ${index + 1}. ${log.data.stockName} (ID: ${log.data.stock})`);
                    console.log(`     Amount: ${log.data.amount || 'N/A'}, Worth: $${log.data.worth || 'N/A'}`);
                    console.log(`     Time: ${log.centralTime}`);
                });
            }
            
            // Get enhanced item market logs
            const itemMarketLogs = await collection
                .find({ 'data.items.itemName': { $exists: true } })
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
            
            if (itemMarketLogs.length > 0) {
                console.log('\n🛒 Enhanced item market logs:');
                itemMarketLogs.forEach((log, index) => {
                    console.log(`  ${index + 1}. ${log.title} - ${log.centralTime}`);
                    log.data.items.forEach((item, idx) => {
                        console.log(`     Item: ${item.itemName} (ID: ${item.id}, Qty: ${item.qty})`);
                    });
                    if (log.data.cost_total) {
                        console.log(`     Total: $${log.data.cost_total}, Fee: $${log.data.fee || 0}`);
                    }
                    if (log.data.price) {
                        console.log(`     Price: $${log.data.price}`);
                    }
                });
            }
            
            // Get enhanced crime logs
            const crimeLogs = await collection
                .find({ 'data.items_gained.itemName': { $exists: true } })
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
            
            if (crimeLogs.length > 0) {
                console.log('\n🦹 Enhanced crime logs:');
                crimeLogs.forEach((log, index) => {
                    console.log(`  ${index + 1}. ${log.data.crime_action || 'Unknown crime'} - ${log.centralTime}`);
                    Object.keys(log.data.items_gained).forEach(itemId => {
                        const itemData = log.data.items_gained[itemId];
                        console.log(`     Gained: ${itemData.itemName} (ID: ${itemId}, Qty: ${itemData.quantity})`);
                    });
                });
            }
            
        } else {
            console.log('📭 No logs found in database');
        }
        
        // Test API endpoints
        console.log('\n🌐 Testing API endpoints...');
        
        // Test logs endpoint
        const logsResponse = await fetch('http://localhost:3000/api/logs?limit=3');
        const logsData = await logsResponse.json();
        console.log(`  /api/logs: ${logsData.totalLogs} logs returned`);
        
        // Test stats endpoint
        const statsResponse = await fetch('http://localhost:3000/api/logs/stats');
        const statsData = await statsResponse.json();
        console.log(`  /api/logs/stats: ${statsData.stats.totalLogs} total logs`);
        
    } catch (error) {
        console.error('❌ Error testing enhanced logs:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB connection closed');
        }
    }
}

// Run the test
if (require.main === module) {
    testEnhancedLogs().catch(console.error);
}

module.exports = { testEnhancedLogs }; 