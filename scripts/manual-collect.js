// Load environment variables
require('dotenv').config();

const { MongoClient } = require('mongodb');
const https = require('https');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'stock_prices';

// Helper function to get time block number based on UTC time
function getTimeBlock(utcDate) {
    const hour = utcDate.getUTCHours();
    
    // Define time blocks based on your schedule
    if (hour >= 8 && hour < 10) return 1;   // 8:00 AM - 10:00 AM UTC
    if (hour >= 10 && hour < 12) return 2;  // 10:00 AM - 12:00 PM UTC
    if (hour >= 12 && hour < 14) return 3;  // 12:00 PM - 2:00 PM UTC
    if (hour >= 14 && hour < 16) return 4;  // 2:00 PM - 4:00 PM UTC
    if (hour >= 16 && hour < 18) return 5;  // 4:00 PM - 6:00 PM UTC
    if (hour >= 18 && hour < 20) return 6;  // 6:00 PM - 8:00 PM UTC
    if (hour >= 20 && hour < 22) return 7;  // 8:00 PM - 10:00 PM UTC
    if (hour >= 22 || hour < 2) return 8;   // 10:00 PM - 2:00 AM UTC
    if (hour >= 2 && hour < 4) return 9;    // 2:00 AM - 4:00 AM UTC
    if (hour >= 4 && hour < 8) return 10;   // 4:00 AM - 8:00 AM UTC
    
    return 0; // Fallback
}

// Helper function to get time of day in Central Time
function getCentralTimeOfDay(utcDate) {
    // Convert UTC to Central Time (UTC-6 for CST, UTC-5 for CDT)
    // For simplicity, we'll use UTC-6 (CST) - you can adjust for daylight saving if needed
    const centralTime = new Date(utcDate.getTime() - (6 * 60 * 60 * 1000));
    
    const hour = centralTime.getUTCHours();
    const minute = centralTime.getUTCMinutes();
    
    // Return time in HH:MM format
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Helper function to get day of week name
function getDayOfWeek(utcDate) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[utcDate.getUTCDay()];
}

// Helper function to get month name
function getMonthName(utcDate) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[utcDate.getUTCMonth()];
}

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

// Fetch stock data from Torn API (manual collection)
async function fetchStockDataManual() {
    console.log('Fetching stock data from Torn City API (MANUAL COLLECTION)...');
    
    const stockData = {};
    const timestamp = new Date();
    
    // Calculate time-based fields
    const timeBlock = getTimeBlock(timestamp);
    const centralTimeOfDay = getCentralTimeOfDay(timestamp);
    const dayOfWeek = getDayOfWeek(timestamp);
    const monthName = getMonthName(timestamp);
    const year = timestamp.getUTCFullYear();
    const monthNumber = timestamp.getUTCMonth() + 1; // 1-12
    const dayOfMonth = timestamp.getUTCDate();
    const hourUTC = timestamp.getUTCHours();
    const minuteUTC = timestamp.getUTCMinutes();
    
    console.log(`Time Block: ${timeBlock}, Central Time: ${centralTimeOfDay}, Day: ${dayOfWeek}, Month: ${monthName} ${year}`);
    console.log(`Collection Type: MANUAL`);
    
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
                timestamp: timestamp,
                // New time-based fields
                time_block: timeBlock,
                central_time: centralTimeOfDay,
                day_of_week: dayOfWeek,
                month_name: monthName,
                year: year,
                month_number: monthNumber,
                day_of_month: dayOfMonth,
                hour_utc: hourUTC,
                minute_utc: minuteUTC,
                collection_type: 'manual' // Manual collection
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
        await collection.createIndex({ time_block: 1 });
        await collection.createIndex({ day_of_week: 1 });
        await collection.createIndex({ collection_type: 1 });
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
        const filename = `manual-stock-data-${timestamp}.json`;
        const filepath = path.join(dataDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(stockData, null, 2));
        console.log(`Local backup saved: ${filename}`);
        
        // Save latest manual data (overwrite)
        const latestFilepath = path.join(dataDir, 'latest-manual-stock-data.json');
        fs.writeFileSync(latestFilepath, JSON.stringify(stockData, null, 2));
        console.log('Latest manual data file updated');
        
    } catch (error) {
        console.error('Error saving local backup:', error.message);
        // Don't throw error for local backup failures
    }
}

// Main execution function
async function main() {
    console.log('=== Torn City Stock Data Collector (MANUAL) ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    if (!TORN_API_KEY) {
        console.error('ERROR: TORN_API_KEY environment variable is required');
        process.exit(1);
    }
    
    try {
        // Fetch stock data
        const stockData = await fetchStockDataManual();
        
        // Store in MongoDB
        await storeStockData(stockData);
        
        // Save local backup
        await saveLocalBackup(stockData);
        
        console.log('=== Manual data collection completed successfully ===');
        
    } catch (error) {
        console.error('=== Manual data collection failed ===');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { fetchStockDataManual, storeStockData, saveLocalBackup }; 