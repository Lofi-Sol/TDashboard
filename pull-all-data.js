// Pull All MongoDB Stock Data Script
require('dotenv').config();

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'stock_prices';

async function pullAllData() {
    console.log('📊 Pulling All Stock Data from MongoDB...\n');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        // Get all data
        console.log('🔍 Fetching all stock data...');
        const allData = await collection.find({}).sort({ timestamp: 1 }).toArray();
        
        console.log(`📈 Total records: ${allData.length}`);
        
        // Group by stock
        const stockGroups = {};
        allData.forEach(record => {
            if (!stockGroups[record.name]) {
                stockGroups[record.name] = [];
            }
            stockGroups[record.name].push({
                timestamp: record.timestamp,
                price: record.current_price,
                timeBlock: record.time_block,
                dayOfWeek: record.day_of_week,
                centralTime: record.central_time
            });
        });
        
        console.log(`📊 Unique stocks: ${Object.keys(stockGroups).length}\n`);
        
        // Show data for each stock
        Object.keys(stockGroups).forEach(stockName => {
            const data = stockGroups[stockName];
            const firstPrice = data[0].price;
            const lastPrice = data[data.length - 1].price;
            const priceChange = lastPrice - firstPrice;
            const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);
            
            console.log(`📋 ${stockName}:`);
            console.log(`   Records: ${data.length}`);
            console.log(`   First Price: $${firstPrice.toLocaleString()}`);
            console.log(`   Last Price: $${lastPrice.toLocaleString()}`);
            console.log(`   Change: ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${percentChange}%)`);
            console.log(`   Date Range: ${data[0].timestamp.toLocaleDateString()} - ${data[data.length - 1].timestamp.toLocaleDateString()}`);
            console.log('');
        });
        
        // Show time block distribution
        console.log('⏰ Time Block Distribution:');
        const timeBlockCounts = {};
        allData.forEach(record => {
            timeBlockCounts[record.time_block] = (timeBlockCounts[record.time_block] || 0) + 1;
        });
        
        Object.keys(timeBlockCounts).sort((a, b) => parseInt(a) - parseInt(b)).forEach(block => {
            console.log(`   Block ${block}: ${timeBlockCounts[block]} records`);
        });
        
        console.log('\n📅 Date Range:');
        console.log(`   Start: ${allData[0].timestamp.toLocaleString()}`);
        console.log(`   End: ${allData[allData.length - 1].timestamp.toLocaleString()}`);
        
        // Show sample data points for graphing
        console.log('\n📊 Sample Data Points for Graphing:');
        const sampleStock = Object.keys(stockGroups)[0];
        const sampleData = stockGroups[sampleStock].slice(0, 5);
        
        console.log(`Sample data for "${sampleStock}":`);
        sampleData.forEach((point, index) => {
            console.log(`   ${index + 1}. ${point.timestamp.toLocaleString()}: $${point.price.toLocaleString()}`);
        });
        
        // Export data structure for reference
        console.log('\n💾 Data Structure for Graphing:');
        console.log('```javascript');
        console.log('const stockData = {');
        Object.keys(stockGroups).forEach((stockName, index) => {
            const data = stockGroups[stockName];
            console.log(`  "${stockName}": [`);
            data.slice(0, 3).forEach(point => {
                console.log(`    { timestamp: "${point.timestamp.toISOString()}", price: ${point.price} },`);
            });
            if (data.length > 3) {
                console.log(`    // ... ${data.length - 3} more points`);
            }
            console.log(`  ]${index < Object.keys(stockGroups).length - 1 ? ',' : ''}`);
        });
        console.log('};');
        console.log('```');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
        console.log('\n🔌 MongoDB connection closed');
    }
}

// Run the script
pullAllData().catch(console.error); 