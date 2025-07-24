const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs_restructured';

async function testRestructuredLogs() {
    let client;
    
    try {
        console.log('🧪 Testing restructured logs...');
        
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Check if collection exists and has data
        const totalLogs = await collection.countDocuments();
        console.log(`📊 Total restructured logs: ${totalLogs.toLocaleString()}`);
        
        if (totalLogs > 0) {
            // Get sample logs with different event types
            const sampleLogs = await collection
                .find({})
                .sort({ 'event.timestamp': -1 })
                .limit(10)
                .toArray();
            
            console.log('\n📋 Sample restructured logs:');
            sampleLogs.forEach((log, index) => {
                console.log(`\n${index + 1}. ${log.event.title} - ${log.metadata.processed_time.central}`);
                console.log(`   Type: ${log.event.type}, Category: ${log.event.category}`);
                console.log(`   Log ID: ${log.log_id || 'N/A'}`);
                
                // Show specific data based on event type
                if (log.item_name) {
                    console.log(`   Item: ${log.item_name} (Qty: ${log.quantity})`);
                }
                
                if (log.travel) {
                    console.log(`   Travel: ${log.travel.origin.name} → ${log.travel.destination.name}`);
                    console.log(`   Method: ${log.travel.method}, Duration: ${log.travel.duration || 'N/A'}`);
                }
                
                if (log.stock_name) {
                    console.log(`   Stock: ${log.stock_name}`);
                }
                
                if (log.crime) {
                    console.log(`   Crime: ${log.crime.action}`);
                    if (log.crime.items_gained) {
                        log.crime.items_gained.forEach(item => {
                            console.log(`     Gained: ${item.item_name} (Qty: ${item.quantity})`);
                        });
                    }
                }
                
                if (log.transaction) {
                    console.log(`   Transaction: ${JSON.stringify(log.transaction, null, 2)}`);
                }
            });
            
            // Get logs by event category
            const categoryStats = await collection.aggregate([
                { $group: { _id: '$event.category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]).toArray();
            
            console.log('\n📊 Logs by event category:');
            categoryStats.forEach(stat => {
                console.log(`  ${stat._id}: ${stat.count.toLocaleString()}`);
            });
            
            // Get logs by event type
            const typeStats = await collection.aggregate([
                { $group: { _id: '$event.type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]).toArray();
            
            console.log('\n📊 Logs by event type:');
            typeStats.forEach(stat => {
                console.log(`  ${stat._id}: ${stat.count.toLocaleString()}`);
            });
            
            // Show specific event type examples
            const eventTypes = ['item_market_sell', 'travel_initiate', 'crime_success_item_gain', 'stock_buy'];
            
            for (const eventType of eventTypes) {
                const eventLogs = await collection
                    .find({ 'event.type': eventType })
                    .sort({ 'event.timestamp': -1 })
                    .limit(3)
                    .toArray();
                
                if (eventLogs.length > 0) {
                    console.log(`\n🎯 ${eventType} examples:`);
                    eventLogs.forEach((log, index) => {
                        console.log(`  ${index + 1}. ${log.event.title} - ${log.metadata.processed_time.central}`);
                        
                        if (log.item_name) {
                            console.log(`     Item: ${log.item_name} (Qty: ${log.quantity})`);
                        }
                        
                        if (log.travel) {
                            console.log(`     Travel: ${log.travel.origin.name} → ${log.travel.destination.name}`);
                        }
                        
                        if (log.stock_name) {
                            console.log(`     Stock: ${log.stock_name}`);
                        }
                        
                        if (log.crime && log.crime.items_gained) {
                            log.crime.items_gained.forEach(item => {
                                console.log(`     Gained: ${item.item_name} (Qty: ${item.quantity})`);
                            });
                        }
                    });
                }
            }
            
            // Show a complete example log
            const completeExample = await collection
                .find({ 'event.type': 'item_market_sell' })
                .sort({ 'event.timestamp': -1 })
                .limit(1)
                .toArray();
            
            if (completeExample.length > 0) {
                console.log('\n📄 Complete example log structure:');
                console.log(JSON.stringify(completeExample[0], null, 2));
            }
            
        } else {
            console.log('📭 No restructured logs found');
        }
        
    } catch (error) {
        console.error('❌ Error testing restructured logs:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB connection closed');
        }
    }
}

// Run the test
if (require.main === module) {
    testRestructuredLogs().catch(console.error);
}

module.exports = { testRestructuredLogs }; 