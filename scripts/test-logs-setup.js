const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'user_logs';

async function testLogsSetup() {
    let client;
    
    try {
        console.log('🧪 Testing logs collection setup...');
        
        // Connect to MongoDB
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Create indexes
        console.log('🔧 Creating indexes...');
        await collection.createIndex({ logId: 1, timestamp: 1 }, { unique: true });
        await collection.createIndex({ timestamp: -1 });
        await collection.createIndex({ logId: 1 });
        await collection.createIndex({ dayOfWeek: 1 });
        await collection.createIndex({ month: 1 });
        await collection.createIndex({ year: 1 });
        console.log('✅ Indexes created successfully');
        
        // Insert a test log to verify the collection works
        const testLog = {
            logId: 999999,
            timestamp: Math.floor(Date.now() / 1000),
            title: 'Test Log Entry',
            category: 'test',
            data: { test: true },
            date: new Date(),
            dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            month: new Date().toLocaleDateString('en-US', { month: 'long' }),
            year: new Date().getFullYear(),
            collectionType: 'test',
            collectedAt: new Date()
        };
        
        console.log('📝 Inserting test log...');
        await collection.insertOne(testLog);
        console.log('✅ Test log inserted successfully');
        
        // Verify the log was inserted
        const totalLogs = await collection.countDocuments();
        console.log(`📊 Total logs in database: ${totalLogs}`);
        
        // Get the test log back
        const retrievedLog = await collection.findOne({ logId: 999999 });
        console.log('📋 Retrieved test log:', {
            logId: retrievedLog.logId,
            title: retrievedLog.title,
            timestamp: retrievedLog.timestamp,
            date: retrievedLog.date
        });
        
        // Clean up test log
        console.log('🧹 Cleaning up test log...');
        await collection.deleteOne({ logId: 999999 });
        console.log('✅ Test log cleaned up');
        
        // Final count
        const finalCount = await collection.countDocuments();
        console.log(`📊 Final log count: ${finalCount}`);
        
        console.log('🎉 Logs collection setup test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error in logs setup test:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 MongoDB connection closed');
        }
    }
}

// Run the test
if (require.main === module) {
    testLogsSetup().catch(console.error);
}

module.exports = { testLogsSetup }; 