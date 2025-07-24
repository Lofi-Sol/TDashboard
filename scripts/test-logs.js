const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs';

async function testLogsCollection() {
    let client;
    
    try {
        console.log('🧪 Testing logs collection...');
        
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
            // Get sample logs
            const sampleLogs = await collection
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
            
            console.log('\n📋 Sample logs:');
            sampleLogs.forEach((log, index) => {
                console.log(`${index + 1}. [${log.logId}] ${log.title || 'No title'} - ${new Date(log.timestamp * 1000).toLocaleString()}`);
            });
            
            // Get logs by day of week
            const dayStats = await collection.aggregate([
                { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]).toArray();
            
            console.log('\n📅 Logs by day of week:');
            dayStats.forEach(stat => {
                console.log(`  ${stat._id}: ${stat.count.toLocaleString()}`);
            });
            
            // Get latest and earliest logs
            const latestLog = await collection.find({}).sort({ timestamp: -1 }).limit(1).toArray();
            const earliestLog = await collection.find({}).sort({ timestamp: 1 }).limit(1).toArray();
            
            if (latestLog.length > 0 && earliestLog.length > 0) {
                console.log('\n⏰ Date range:');
                console.log(`  Earliest: ${new Date(earliestLog[0].timestamp * 1000).toLocaleString()}`);
                console.log(`  Latest: ${new Date(latestLog[0].timestamp * 1000).toLocaleString()}`);
            }
            
        } else {
            console.log('📭 No logs found in database');
        }
        
        // Test indexes
        console.log('\n🔍 Checking indexes...');
        const indexes = await collection.indexes();
        console.log(`  Found ${indexes.length} indexes:`);
        indexes.forEach(index => {
            console.log(`    - ${index.name}: ${JSON.stringify(index.key)}`);
        });
        
    } catch (error) {
        console.error('❌ Error testing logs collection:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB connection closed');
        }
    }
}

// Run the test
if (require.main === module) {
    testLogsCollection().catch(console.error);
}

module.exports = { testLogsCollection }; 