// Alternative ranked wars collector with multiple endpoint attempts
require('dotenv').config();

const { MongoClient } = require('mongodb');
const https = require('https');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const TORN_API_KEY = process.env.TORN_API_KEY;
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'ranked_wars';

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

// Try different API endpoints for ranked wars data
async function fetchRankedWarsData() {
    console.log('Fetching ranked wars data from Torn City API...');
    
    if (!TORN_API_KEY) {
        throw new Error('TORN_API_KEY environment variable is required');
    }
    
    // Try different endpoints
    const endpoints = [
        {
            name: 'Ranked Wars (v2)',
            url: `https://api.torn.com/v2/?selections=rankedwars&key=${TORN_API_KEY}`
        },
        {
            name: 'Ranked Wars (v1)',
            url: `https://api.torn.com/torn/?selections=rankedwars&key=${TORN_API_KEY}`
        },
        {
            name: 'Faction Wars',
            url: `https://api.torn.com/v2/faction/?selections=wars&key=${TORN_API_KEY}`
        }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Trying ${endpoint.name}...`);
            const data = await makeRequest(endpoint.url);
            
            if (data.error) {
                console.log(`❌ ${endpoint.name}: ${data.error.error}`);
                continue;
            }
            
            // Check for ranked wars data
            if (data.rankedwars) {
                console.log(`✅ Success with ${endpoint.name}! Found ${Object.keys(data.rankedwars).length} wars.`);
                return data.rankedwars;
            }
            
            // Check for faction wars data
            if (data.wars) {
                console.log(`✅ Success with ${endpoint.name}! Found ${Object.keys(data.wars).length} wars.`);
                return data.wars;
            }
            
            console.log(`⚠️ ${endpoint.name}: No war data found in response`);
            
        } catch (error) {
            console.log(`❌ ${endpoint.name}: ${error.message}`);
        }
    }
    
    throw new Error('All API endpoints failed. Please check your API key access level.');
}

// Store ranked wars data in MongoDB with duplicate prevention
async function storeRankedWarsData(rankedWarsData) {
    console.log('Storing ranked wars data in MongoDB...');
    
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        const timestamp = new Date();
        let updatedCount = 0;
        let insertedCount = 0;
        
        // Process each war
        for (const [warId, warData] of Object.entries(rankedWarsData)) {
            // Add metadata to the war data
            const warDocument = {
                war_id: parseInt(warId),
                ...warData,
                last_updated: timestamp,
                created_at: timestamp
            };
            
            // Check if this war already exists in the database
            const existingWar = await collection.findOne({ war_id: parseInt(warId) });
            
            if (existingWar) {
                // Update existing war with new data
                const updateResult = await collection.updateOne(
                    { war_id: parseInt(warId) },
                    { 
                        $set: {
                            ...warData,
                            last_updated: timestamp
                        }
                    }
                );
                
                if (updateResult.modifiedCount > 0) {
                    updatedCount++;
                    console.log(`Updated war ${warId}`);
                }
            } else {
                // Insert new war
                const insertResult = await collection.insertOne(warDocument);
                if (insertResult.insertedId) {
                    insertedCount++;
                    console.log(`Inserted new war ${warId}`);
                }
            }
        }
        
        console.log(`✅ Ranked wars data stored successfully:`);
        console.log(`   - Updated: ${updatedCount} wars`);
        console.log(`   - Inserted: ${insertedCount} new wars`);
        console.log(`   - Total processed: ${Object.keys(rankedWarsData).length} wars`);
        
    } catch (error) {
        console.error('❌ Error storing ranked wars data:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Save local backup of the data
async function saveLocalBackup(rankedWarsData) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const backupDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `ranked-wars-${timestamp}.json`);
        
        const backupData = {
            timestamp: new Date().toISOString(),
            war_count: Object.keys(rankedWarsData).length,
            wars: rankedWarsData
        };
        
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`📁 Local backup saved: ${backupFile}`);
        
    } catch (error) {
        console.error('Warning: Failed to save local backup:', error.message);
    }
}

// Main function
async function main() {
    console.log('🚀 Starting ranked wars data collection (v2)...');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    try {
        // Fetch data from Torn API
        const rankedWarsData = await fetchRankedWarsData();
        
        // Store in MongoDB
        await storeRankedWarsData(rankedWarsData);
        
        // Save local backup
        await saveLocalBackup(rankedWarsData);
        
        console.log('✅ Ranked wars data collection completed successfully!');
        
    } catch (error) {
        console.error('❌ Ranked wars data collection failed:', error.message);
        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main();
}

module.exports = {
    fetchRankedWarsData,
    storeRankedWarsData,
    saveLocalBackup
}; 