// MongoDB Data Test Script
require('dotenv').config();

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'stock_prices';

async function testMongoData() {
    console.log('🔍 Testing MongoDB Data Retrieval...\n');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        // Get total document count
        const totalCount = await collection.countDocuments();
        console.log(`📊 Total documents in collection: ${totalCount}\n`);
        
        // Get sample documents to understand structure
        console.log('📋 Sample Documents:');
        const sampleDocs = await collection.find({}).limit(3).toArray();
        
        sampleDocs.forEach((doc, index) => {
            console.log(`\n--- Document ${index + 1} ---`);
            console.log('ID:', doc._id);
            console.log('Stock Name:', doc.name);
            console.log('Acronym:', doc.acronym);
            console.log('Current Price:', doc.current_price);
            console.log('Timestamp:', doc.timestamp);
            console.log('Time Block:', doc.time_block);
            console.log('Day of Week:', doc.day_of_week);
            console.log('Month:', doc.month_of_year);
            console.log('Year:', doc.year);
            console.log('Central Time:', doc.central_time);
            console.log('Collection Type:', doc.collection_type);
        });
        
        // Get unique stocks
        const uniqueStocks = await collection.distinct('name');
        console.log(`\n📈 Unique Stocks in Database: ${uniqueStocks.length}`);
        console.log('Sample stocks:', uniqueStocks.slice(0, 5));
        
        // Get data by time blocks
        console.log('\n⏰ Data by Time Blocks:');
        const timeBlockStats = await collection.aggregate([
            { $group: { _id: '$time_block', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]).toArray();
        
        timeBlockStats.forEach(stat => {
            console.log(`   Block ${stat._id}: ${stat.count} records`);
        });
        
        // Get recent data for a specific stock
        console.log('\n🔍 Recent Data for "Torn City Bank":');
        const recentBankData = await collection
            .find({ name: 'Torn City Bank' })
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
        
        recentBankData.forEach((doc, index) => {
            console.log(`   ${index + 1}. $${doc.current_price.toLocaleString()} - ${doc.timestamp.toLocaleString()}`);
        });
        
        // Test aggregation - get average price by stock
        console.log('\n📊 Average Prices by Stock (Sample):');
        const avgPrices = await collection.aggregate([
            { $group: { _id: '$name', avgPrice: { $avg: '$current_price' } } },
            { $sort: { avgPrice: -1 } },
            { $limit: 5 }
        ]).toArray();
        
        avgPrices.forEach(stock => {
            console.log(`   ${stock._id}: $${Math.round(stock.avgPrice).toLocaleString()}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run the test
testMongoData().catch(console.error); 