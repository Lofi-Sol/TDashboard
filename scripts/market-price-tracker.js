const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

// Load item details for categorization and naming
const itemDetails = JSON.parse(fs.readFileSync(path.join(__dirname, '../itemdetails.json'), 'utf8'));

// CONFIGURE THESE:
const TORN_API_KEY = process.env.TORN_API_KEY;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'tornlogs';
const COLLECTION = 'market_prices';

// Item categories for different batches
const ITEM_CATEGORIES = {
    high_priority: ['Drug', 'Plushie', 'Flower', 'Weapon', 'Armor'],
    medium_priority: ['Medical', 'Alcohol', 'Energy', 'Temporary'],
    low_priority: ['Other', 'Collectible', 'Special']
};

function getItemName(itemId) {
    return itemDetails.itemsById && itemDetails.itemsById[itemId]
        ? itemDetails.itemsById[itemId].name
        : `Item #${itemId}`;
}

function getItemCategory(itemId) {
    if (!itemDetails.itemsById || !itemDetails.itemsById[itemId]) {
        return 'low_priority';
    }
    const itemType = itemDetails.itemsById[itemId].type || '';
    
    if (ITEM_CATEGORIES.high_priority.includes(itemType)) return 'high_priority';
    if (ITEM_CATEGORIES.medium_priority.includes(itemType)) return 'medium_priority';
    return 'low_priority';
}

function getBatchId() {
    const now = DateTime.now().setZone('America/Chicago');
    const hour = now.hour;
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
}

function getItemsForBatch(batchId) {
    const allItems = Object.keys(itemDetails.itemsById || {});
    
    switch (batchId) {
        case 'morning':
            return allItems.filter(id => getItemCategory(id) === 'high_priority');
        case 'afternoon':
            return allItems.filter(id => getItemCategory(id) === 'medium_priority');
        case 'evening':
            return allItems.filter(id => getItemCategory(id) === 'low_priority');
        case 'night':
            return allItems; // Full scan
        default:
            return allItems.slice(0, 50); // Default to first 50 items
    }
}

async function fetchItemMarketPrice(itemId) {
    try {
        const url = `https://api.torn.com/v2/market/${itemId}/itemmarket?key=${TORN_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error(`Error fetching market data for item ${itemId}:`, data.error);
            return null;
        }
        
        if (!data.itemmarket || !data.itemmarket.listings || !Array.isArray(data.itemmarket.listings)) {
            return null;
        }
        
        const listings = data.itemmarket.listings.filter(listing => listing.price && listing.price > 0);
        
        if (listings.length === 0) return null;
        
        const prices = listings.map(l => l.price);
        const quantities = listings.map(l => l.amount || 0);
        
        return {
            itemId: itemId.toString(),
            itemName: getItemName(itemId),
            lowest_price: Math.min(...prices),
            highest_price: Math.max(...prices),
            avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            total_listings: listings.length,
            total_quantity: quantities.reduce((a, b) => a + b, 0)
        };
    } catch (error) {
        console.error(`Error fetching market data for item ${itemId}:`, error.message);
        return null;
    }
}

async function storeMarketPrices(prices, batchId) {
    let client;
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION);
        
        const now = DateTime.now().setZone('America/Chicago');
        const document = {
            timestamp: now.toJSDate(),
            date: now.toISODate(),
            batch_id: batchId,
            prices: prices.filter(p => p !== null)
        };
        
        await collection.insertOne(document);
        console.log(`Stored ${document.prices.length} market prices for batch ${batchId}`);
        
    } catch (err) {
        console.error('MongoDB connection or operation failed:', err);
        throw err;
    } finally {
        if (client) await client.close();
    }
}

async function main() {
    console.log('--- Market Price Tracker Started ---');
    
    const batchId = getBatchId();
    const items = getItemsForBatch(batchId);
    
    console.log(`Processing ${items.length} items for ${batchId} batch`);
    
    const prices = [];
    let processed = 0;
    
    // Process items in smaller chunks to avoid overwhelming the API
    const chunkSize = 10;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        
        const chunkPromises = chunk.map(async (itemId) => {
            const price = await fetchItemMarketPrice(itemId);
            processed++;
            if (processed % 50 === 0) {
                console.log(`Processed ${processed}/${items.length} items`);
            }
            return price;
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        prices.push(...chunkResults);
        
        // Small delay between chunks to be respectful to the API
        if (i + chunkSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    await storeMarketPrices(prices, batchId);
    
    console.log(`--- Market Price Tracker Finished ---`);
    console.log(`Processed ${items.length} items, stored ${prices.filter(p => p !== null).length} prices`);
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
}); 