// Load environment variables
require('dotenv').config();

const { MongoClient } = require('mongodb');
const https = require('https');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;

// Test MongoDB connection
async function testMongoDBConnection() {
    console.log('Testing MongoDB connection...');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('✅ MongoDB connection successful');
        
        // Test database access
        const database = client.db('torn_data');
        const collections = await database.listCollections().toArray();
        console.log(`✅ Database 'torn_data' accessible`);
        console.log(`   Collections found: ${collections.length}`);
        
        // Test collection access
        const collection = database.collection('stock_prices');
        const count = await collection.countDocuments();
        console.log(`✅ Collection 'stock_prices' accessible`);
        console.log(`   Documents in collection: ${count}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    } finally {
        await client.close();
    }
}

// Test Torn API connection
async function testTornAPI() {
    console.log('\nTesting Torn API connection...');
    
    if (!TORN_API_KEY) {
        console.error('❌ TORN_API_KEY not found in environment variables');
        return false;
    }
    
    return new Promise((resolve) => {
        const url = `https://api.torn.com/torn/?selections=stocks&key=${TORN_API_KEY}`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (jsonData.error) {
                        console.error('❌ Torn API error:', jsonData.error.error);
                        resolve(false);
                    } else if (jsonData.stocks) {
                        const stockCount = Object.keys(jsonData.stocks).length;
                        console.log('✅ Torn API connection successful');
                        console.log(`   Stocks available: ${stockCount}`);
                        
                        // Show sample data structure with new fields
                        const sampleStockId = Object.keys(jsonData.stocks)[0];
                        if (sampleStockId) {
                            const sampleStock = jsonData.stocks[sampleStockId];
                            const timestamp = new Date();
                            console.log('\n📊 Sample data structure with new fields:');
                            console.log(`   Stock: ${sampleStock.name} (${sampleStock.acronym})`);
                            console.log(`   Price: $${sampleStock.current_price.toLocaleString()}`);
                            console.log(`   Time Block: ${getTimeBlock(timestamp)}`);
                            console.log(`   Central Time: ${getCentralTimeOfDay(timestamp)}`);
                            console.log(`   Day: ${getDayOfWeek(timestamp)}`);
                            console.log(`   Date: ${getMonthName(timestamp)} ${timestamp.getUTCDate()}, ${timestamp.getUTCFullYear()}`);
                        }
                        
                        resolve(true);
                    } else {
                        console.error('❌ Unexpected API response format');
                        resolve(false);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse API response:', error.message);
                    resolve(false);
                }
            });
        }).on('error', (error) => {
            console.error('❌ Torn API request failed:', error.message);
            resolve(false);
        });
    });
}

// Helper functions for time calculations (same as in collect-stock-data.js)
function getTimeBlock(utcDate) {
    const hour = utcDate.getUTCHours();
    if (hour >= 8 && hour < 10) return 1;
    if (hour >= 10 && hour < 12) return 2;
    if (hour >= 12 && hour < 14) return 3;
    if (hour >= 14 && hour < 16) return 4;
    if (hour >= 16 && hour < 18) return 5;
    if (hour >= 18 && hour < 20) return 6;
    if (hour >= 20 && hour < 22) return 7;
    if (hour >= 22 || hour < 2) return 8;
    if (hour >= 2 && hour < 4) return 9;
    if (hour >= 4 && hour < 8) return 10;
    return 0;
}

function getCentralTimeOfDay(utcDate) {
    const centralTime = new Date(utcDate.getTime() - (6 * 60 * 60 * 1000));
    const hour = centralTime.getUTCHours();
    const minute = centralTime.getUTCMinutes();
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function getDayOfWeek(utcDate) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[utcDate.getUTCDay()];
}

function getMonthName(utcDate) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[utcDate.getUTCMonth()];
}

// Test data directory
function testDataDirectory() {
    console.log('\nTesting data directory...');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('✅ Data directory created');
        } else {
            console.log('✅ Data directory exists');
        }
        
        // Test write permissions
        const testFile = path.join(dataDir, 'test-write.json');
        fs.writeFileSync(testFile, JSON.stringify({ test: true }));
        fs.unlinkSync(testFile);
        console.log('✅ Data directory is writable');
        
        return true;
        
    } catch (error) {
        console.error('❌ Data directory test failed:', error.message);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('=== Torn City Stock Data Collector - Connection Tests ===\n');
    
    const results = {
        mongodb: await testMongoDBConnection(),
        tornApi: await testTornAPI(),
        dataDir: testDataDirectory()
    };
    
    console.log('\n=== Test Results ===');
    console.log(`MongoDB: ${results.mongodb ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Torn API: ${results.tornApi ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Data Directory: ${results.dataDir ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
        console.log('\n🎉 All tests passed! Your setup is ready for data collection.');
        console.log('\nNext steps:');
        console.log('1. Push this repository to GitHub');
        console.log('2. Configure GitHub Secrets (MONGODB_URI and TORN_API_KEY)');
        console.log('3. The GitHub Actions workflow will automatically start collecting data');
    } else {
        console.log('\n⚠️  Some tests failed. Please fix the issues before proceeding.');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { testMongoDBConnection, testTornAPI, testDataDirectory }; 