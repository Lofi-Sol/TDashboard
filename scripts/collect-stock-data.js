// Load environment variables
require('dotenv').config();

const { MongoClient } = require('mongodb');
const https = require('https');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'stock_prices';

// Torn City stock IDs
const STOCK_IDS = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
    '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
    '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'
];

// Helper function to make HTTP requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });
    });
}

// Fetch stock data from Torn API
async function fetchStockData() {
    console.log('Fetching stock data from Torn City API...');
    
    const stockData = {};
    const timestamp = new Date();
    
    try {
        // Fetch all stocks data
        const url = `https://api.torn.com/torn/?selections=stocks&key=${TORN_API_KEY}`;
        const response = await makeRequest(url);
        
        if (response.error) {
            throw new Error(`API Error: ${response.error.error}`);
        }
        
        if (!response.stocks) {
            throw new Error('No stocks data received from API');
        }
        
        // Process each stock
        Object.keys(response.stocks).forEach(stockId => {
            const stock = response.stocks[stockId];
            stockData[stockId] = {
                stock_id: stockId,
                name: stock.name,
                acronym: stock.acronym,
                current_price: stock.current_price,
                market_cap: stock.market_cap,
                total_shares: stock.total_shares,
                investors: stock.investors,
                benefit: stock.benefit,
                timestamp: timestamp
            };
        });
        
        console.log(`Successfully fetched data for ${Object.keys(stockData).length} stocks`);
        return stockData;
        
    } catch (error) {
        console.error('Error fetching stock data:', error.message);
        throw error;
    }
}

// Store data in MongoDB
async function storeStockData(stockData) {
    console.log('Connecting to MongoDB...');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const database = client.db(DATABASE_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        // Prepare documents for insertion
        const documents = Object.values(stockData).map(stock => ({
            ...stock,
            created_at: new Date()
        }));
        
        // Insert the data
        const result = await collection.insertMany(documents);
        console.log(`Successfully stored ${result.insertedCount} stock records in MongoDB`);
        
        // Create indexes for better query performance
        await collection.createIndex({ stock_id: 1, timestamp: -1 });
        await collection.createIndex({ timestamp: -1 });
        console.log('Database indexes created/updated');
        
    } catch (error) {
        console.error('Error storing data in MongoDB:', error.message);
        throw error;
    } finally {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Create data directory and save local backup
async function saveLocalBackup(stockData) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Save current data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `stock-data-${timestamp}.json`;
        const filepath = path.join(dataDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(stockData, null, 2));
        console.log(`Local backup saved: ${filename}`);
        
        // Save latest data (overwrite)
        const latestFilepath = path.join(dataDir, 'latest-stock-data.json');
        fs.writeFileSync(latestFilepath, JSON.stringify(stockData, null, 2));
        console.log('Latest data file updated');
        
    } catch (error) {
        console.error('Error saving local backup:', error.message);
        // Don't throw error for local backup failures
    }
}

// Main execution function
async function main() {
    console.log('=== Torn City Stock Data Collector ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    if (!TORN_API_KEY) {
        console.error('ERROR: TORN_API_KEY environment variable is required');
        process.exit(1);
    }
    
    try {
        // Fetch stock data
        const stockData = await fetchStockData();
        
        // Store in MongoDB
        await storeStockData(stockData);
        
        // Save local backup
        await saveLocalBackup(stockData);
        
        console.log('=== Data collection completed successfully ===');
        
    } catch (error) {
        console.error('=== Data collection failed ===');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { fetchStockData, storeStockData, saveLocalBackup }; 