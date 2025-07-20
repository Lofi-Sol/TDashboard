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