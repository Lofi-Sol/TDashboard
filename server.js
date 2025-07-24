const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData';
const DATABASE_NAME = 'torn_data';
const COLLECTION_NAME = 'stock_prices';

// Middleware
app.use(express.json());
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.static('.')); // Serve static files from current directory

// MongoDB connection
let db = null;

async function connectToMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DATABASE_NAME);
        console.log('✅ Connected to MongoDB');
        return client;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}

// API Routes

// Get stock data with filters
app.post('/api/stock-data', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const { stock, timeBlock, dayOfWeek, collectionType, limit = 50 } = req.body;
        
        // Build filter object
        const filter = {};
        
        if (stock) {
            filter.name = { $regex: stock.split(' (')[0], $options: 'i' };
        }
        
        if (timeBlock) {
            filter.time_block = parseInt(timeBlock);
        }
        
        if (dayOfWeek) {
            filter.day_of_week = dayOfWeek;
        }
        
        if (collectionType) {
            filter.collection_type = collectionType;
        }

        const collection = db.collection(COLLECTION_NAME);
        const data = await collection
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();

        // Get yesterday's first prices (Block 1) for each stock, or earliest available price
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);

        // First try to get yesterday's Block 1 prices
        let yesterdayFirstPrices = await collection
            .aggregate([
                {
                    $match: {
                        time_block: 1,
                        timestamp: {
                            $gte: yesterdayStart,
                            $lt: yesterdayEnd
                        }
                    }
                },
                {
                    $sort: { timestamp: 1 }
                },
                {
                    $group: {
                        _id: '$stock_id',
                        firstPrice: { $first: '$current_price' },
                        stockName: { $first: '$name' },
                        stockAcronym: { $first: '$acronym' }
                    }
                }
            ])
            .toArray();

        // If no yesterday data, get the earliest available price for each stock
        if (yesterdayFirstPrices.length === 0) {
            yesterdayFirstPrices = await collection
                .aggregate([
                    {
                        $sort: { timestamp: 1 }
                    },
                    {
                        $group: {
                            _id: '$stock_id',
                            firstPrice: { $first: '$current_price' },
                            stockName: { $first: '$name' },
                            stockAcronym: { $first: '$acronym' },
                            firstTimestamp: { $first: '$timestamp' }
                        }
                    }
                ])
                .toArray();
        }

        // Create a map for quick lookup
        const yesterdayPricesMap = {};
        yesterdayFirstPrices.forEach(item => {
            yesterdayPricesMap[item._id] = item.firstPrice;
        });

        // Add yesterday's first price to each stock record
        const enrichedData = data.map(stock => ({
            ...stock,
            yesterday_first_price: yesterdayPricesMap[stock.stock_id] || null
        }));

        res.json({
            success: true,
            data: enrichedData,
            count: enrichedData.length,
            filters: req.body,
            yesterday_date: yesterdayStart.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get latest stock data
app.get('/api/stock-data/latest', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const collection = db.collection(COLLECTION_NAME);
        
        // Get the latest timestamp
        const latestRecord = await collection
            .find({})
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();

        if (latestRecord.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        const latestTimestamp = latestRecord[0].timestamp;
        
        // Get all records from the latest timestamp
        const data = await collection
            .find({ timestamp: latestTimestamp })
            .sort({ stock_id: 1 })
            .toArray();

        // Get yesterday's first prices (Block 1) for each stock, or earliest available price
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);

        // First try to get yesterday's Block 1 prices
        let yesterdayFirstPrices = await collection
            .aggregate([
                {
                    $match: {
                        time_block: 1,
                        timestamp: {
                            $gte: yesterdayStart,
                            $lt: yesterdayEnd
                        }
                    }
                },
                {
                    $sort: { timestamp: 1 }
                },
                {
                    $group: {
                        _id: '$stock_id',
                        firstPrice: { $first: '$current_price' },
                        stockName: { $first: '$name' },
                        stockAcronym: { $first: '$acronym' }
                    }
                }
            ])
            .toArray();

        // If no yesterday data, get the earliest available price for each stock
        if (yesterdayFirstPrices.length === 0) {
            yesterdayFirstPrices = await collection
                .aggregate([
                    {
                        $sort: { timestamp: 1 }
                    },
                    {
                        $group: {
                            _id: '$stock_id',
                            firstPrice: { $first: '$current_price' },
                            stockName: { $first: '$name' },
                            stockAcronym: { $first: '$acronym' },
                            firstTimestamp: { $first: '$timestamp' }
                        }
                    }
                ])
                .toArray();
        }

        // Create a map for quick lookup
        const yesterdayPricesMap = {};
        yesterdayFirstPrices.forEach(item => {
            yesterdayPricesMap[item._id] = item.firstPrice;
        });

        // Add yesterday's first price to each stock record
        const enrichedData = data.map(stock => ({
            ...stock,
            yesterday_first_price: yesterdayPricesMap[stock.stock_id] || null
        }));

        res.json({
            success: true,
            data: enrichedData,
            count: enrichedData.length,
            latestTimestamp: latestTimestamp,
            yesterday_date: yesterdayStart.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error('Error fetching latest stock data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const collection = db.collection(COLLECTION_NAME);
        
        const totalRecords = await collection.countDocuments();
        const uniqueStocks = await collection.distinct('stock_id');
        const latestRecord = await collection
            .find({})
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();
        
        const timeBlocks = await collection.distinct('time_block');
        const collectionTypes = await collection.distinct('collection_type');
        const daysOfWeek = await collection.distinct('day_of_week');

        res.json({
            success: true,
            stats: {
                totalRecords,
                uniqueStocks: uniqueStocks.length,
                latestUpdate: latestRecord.length > 0 ? latestRecord[0].timestamp : null,
                timeBlocks: timeBlocks.length,
                collectionTypes,
                daysOfWeek
            }
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get unique stocks
app.get('/api/stocks', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const collection = db.collection(COLLECTION_NAME);
        const stocks = await collection
            .aggregate([
                {
                    $group: {
                        _id: '$stock_id',
                        name: { $first: '$name' },
                        acronym: { $first: '$acronym' },
                        latestPrice: { $first: '$current_price' },
                        latestUpdate: { $first: '$timestamp' }
                    }
                },
                { $sort: { name: 1 } }
            ])
            .toArray();

        res.json({
            success: true,
            data: stocks
        });

    } catch (error) {
        console.error('Error fetching stocks:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get stock price history
app.get('/api/stock/:stockId/history', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const { stockId } = req.params;
        const { days = 7 } = req.query;

        const collection = db.collection(COLLECTION_NAME);
        
        // Calculate date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const data = await collection
            .find({
                stock_id: stockId,
                timestamp: { $gte: startDate }
            })
            .sort({ timestamp: 1 })
            .toArray();

        res.json({
            success: true,
            data: data,
            stockId: stockId,
            days: parseInt(days)
        });

    } catch (error) {
        console.error('Error fetching stock history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all historical stock data for graphing
app.get('/api/stocks/history', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const { 
            stockName, 
            days = 30, 
            timeBlock, 
            limit = 1000 
        } = req.query;

        const collection = db.collection(COLLECTION_NAME);
        
        // Build filter
        const filter = {};
        
        if (stockName) {
            filter.name = { $regex: stockName, $options: 'i' };
        }
        
        if (timeBlock) {
            filter.time_block = parseInt(timeBlock);
        }
        
        // Calculate date range - handle limited data scenario
        let startDate;
        if (parseInt(days) === 7) {
            // For week view, get the last 7 days of available data
            const latestRecord = await collection
                .find({})
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray();
            
            if (latestRecord.length > 0) {
                const latestDate = latestRecord[0].timestamp;
                startDate = new Date(latestDate);
                startDate.setDate(startDate.getDate() - 7);
            } else {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
            }
        } else {
            // For other views, use the standard calculation
            startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
        }
        
        filter.timestamp = { $gte: startDate };

        let query = collection.find(filter).sort({ timestamp: 1 });
        
        // Only apply limit if specified
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        
        const data = await query.toArray();

        // Group data by stock for easier charting
        const groupedData = {};
        data.forEach(record => {
            if (!groupedData[record.name]) {
                groupedData[record.name] = [];
            }
            groupedData[record.name].push({
                timestamp: record.timestamp,
                price: record.current_price,
                timeBlock: record.time_block,
                dayOfWeek: record.day_of_week,
                centralTime: record.central_time
            });
        });

        res.json({
            success: true,
            data: groupedData,
            totalRecords: data.length,
            uniqueStocks: Object.keys(groupedData).length,
            dateRange: {
                start: startDate,
                end: new Date()
            }
        });

    } catch (error) {
        console.error('Error fetching stock history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all data without date filtering (for complete dataset)
app.get('/api/stocks/all-data', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

                    const { 
                stockName, 
                timeBlock, 
                limit 
            } = req.query;

        const collection = db.collection(COLLECTION_NAME);
        
        // Build filter
        const filter = {};
        
        if (stockName) {
            filter.name = { $regex: stockName, $options: 'i' };
        }
        
        if (timeBlock) {
            filter.time_block = parseInt(timeBlock);
        }

        let query = collection.find(filter).sort({ timestamp: 1 });
        
        // Only apply limit if specified
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        
        const data = await query.toArray();

        // Group data by stock
        const groupedData = {};
        data.forEach(record => {
            if (!groupedData[record.name]) {
                groupedData[record.name] = [];
            }
            groupedData[record.name].push({
                timestamp: record.timestamp,
                price: record.current_price,
                timeBlock: record.time_block,
                dayOfWeek: record.day_of_week,
                centralTime: record.central_time,
                collectionType: record.collection_type
            });
        });

        res.json({
            success: true,
            data: groupedData,
            totalRecords: data.length,
            uniqueStocks: Object.keys(groupedData).length,
            dateRange: {
                start: data.length > 0 ? data[0].timestamp : null,
                end: data.length > 0 ? data[data.length - 1].timestamp : null
            }
        });

    } catch (error) {
        console.error('Error fetching all stock data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve the test page
app.get('/mongo-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'mongo-test.html'));
});

// Serve the odds API test page
app.get('/odds-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'odds-api-tester.html'));
});

// Serve the stock graphs page
app.get('/stock-graphs', (req, res) => {
    res.sendFile(path.join(__dirname, 'stock-graphs.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
    });
});

// Odds API Configuration
const ODDS_API_KEY = process.env.ODDS_API_KEY || 'test-api-key';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

// Generate mock odds data
function generateMockOddsData(sport, market) {
    const now = new Date();
    const teams = {
        'soccer_epl': [
            { home: 'Manchester United', away: 'Liverpool' },
            { home: 'Arsenal', away: 'Chelsea' },
            { home: 'Manchester City', away: 'Tottenham' },
            { home: 'Newcastle', away: 'Aston Villa' }
        ],
        'basketball_nba': [
            { home: 'Lakers', away: 'Warriors' },
            { home: 'Celtics', away: 'Heat' },
            { home: 'Bucks', away: 'Nets' },
            { home: 'Suns', away: 'Clippers' }
        ],
        'americanfootball_nfl': [
            { home: 'Patriots', away: 'Bills' },
            { home: 'Chiefs', away: 'Raiders' },
            { home: 'Cowboys', away: 'Eagles' },
            { home: 'Packers', away: 'Vikings' }
        ],
        'baseball_mlb': [
            { home: 'Yankees', away: 'Red Sox' },
            { home: 'Dodgers', away: 'Giants' },
            { home: 'Astros', away: 'Rangers' },
            { home: 'Braves', away: 'Mets' }
        ],
        'icehockey_nhl': [
            { home: 'Maple Leafs', away: 'Canadiens' },
            { home: 'Bruins', away: 'Rangers' },
            { home: 'Blackhawks', away: 'Red Wings' },
            { home: 'Penguins', away: 'Capitals' }
        ]
    };

    const sportTitles = {
        'soccer_epl': 'Premier League',
        'basketball_nba': 'NBA',
        'americanfootball_nfl': 'NFL',
        'baseball_mlb': 'MLB',
        'icehockey_nhl': 'NHL'
    };

    const defaultTeams = [
        { home: 'Team A', away: 'Team B' },
        { home: 'Team C', away: 'Team D' },
        { home: 'Team E', away: 'Team F' }
    ];

    const selectedTeams = teams[sport] || defaultTeams;
    const sportTitle = sportTitles[sport] || 'Sports';

    return selectedTeams.map((matchup, index) => {
        const startTime = new Date(now.getTime() + (index + 1) * 3600000); // 1 hour apart
        
        let outcomes = [];
        if (market === 'h2h') {
            outcomes = [
                { name: matchup.home, price: Math.random() > 0.5 ? 150 : -120 },
                { name: matchup.away, price: Math.random() > 0.5 ? 180 : -140 }
            ];
        } else if (market === 'spreads') {
            outcomes = [
                { name: matchup.home, price: -110, point: -2.5 },
                { name: matchup.away, price: -110, point: 2.5 }
            ];
        } else if (market === 'totals') {
            outcomes = [
                { name: 'Over', price: -110, point: 45.5 },
                { name: 'Under', price: -110, point: 45.5 }
            ];
        }

        return {
            id: `mock_${sport}_${index}`,
            sport_key: sport,
            sport_title: sportTitle,
            commence_time: startTime.toISOString(),
            home_team: matchup.home,
            away_team: matchup.away,
            bookmakers: [
                {
                    key: 'mock_bookmaker',
                    title: 'Mock Sportsbook',
                    last_update: new Date().toISOString(),
                    markets: [
                        {
                            key: market,
                            last_update: new Date().toISOString(),
                            outcomes: outcomes
                        }
                    ]
                }
            ]
        };
    });
}

// Get available sports
app.get('/api/sports', async (req, res) => {
    try {
        const response = await axios.get(`${ODDS_API_BASE_URL}/sports`, {
            params: {
                apiKey: ODDS_API_KEY
            }
        });

        res.json({
            success: true,
            data: response.data,
            remaining_requests: response.headers['x-requests-remaining'],
            used_requests: response.headers['x-requests-used']
        });

    } catch (error) {
        console.error('Error fetching sports:', error);
        
        // If API key is invalid, return mock data
        if (error.response?.status === 401) {
            const mockSports = [
                {
                    key: 'soccer_epl',
                    group: 'Soccer',
                    title: 'Premier League',
                    description: 'English Premier League',
                    active: true,
                    has_outrights: false
                },
                {
                    key: 'basketball_nba',
                    group: 'Basketball',
                    title: 'NBA',
                    description: 'National Basketball Association',
                    active: true,
                    has_outrights: false
                },
                {
                    key: 'americanfootball_nfl',
                    group: 'American Football',
                    title: 'NFL',
                    description: 'National Football League',
                    active: true,
                    has_outrights: false
                },
                {
                    key: 'baseball_mlb',
                    group: 'Baseball',
                    title: 'MLB',
                    description: 'Major League Baseball',
                    active: true,
                    has_outrights: false
                },
                {
                    key: 'icehockey_nhl',
                    group: 'Ice Hockey',
                    title: 'NHL',
                    description: 'National Hockey League',
                    active: true,
                    has_outrights: false
                }
            ];
            
            res.json({
                success: true,
                data: mockSports,
                remaining_requests: 'Mock Data',
                used_requests: 'Mock Data',
                note: 'Using mock data due to invalid API key'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.response?.data || error.message
            });
        }
    }
});

// Get odds for upcoming games
app.get('/api/odds', async (req, res) => {
    try {
        const { sport = 'upcoming', region = 'us', market = 'h2h', oddsFormat = 'american', dateFormat = 'iso' } = req.query;

        const response = await axios.get(`${ODDS_API_BASE_URL}/sports/${sport}/odds`, {
            params: {
                apiKey: ODDS_API_KEY,
                regions: region,
                markets: market,
                oddsFormat: oddsFormat,
                dateFormat: dateFormat
            }
        });

        res.json({
            success: true,
            data: response.data,
            remaining_requests: response.headers['x-requests-remaining'],
            used_requests: response.headers['x-requests-used']
        });

    } catch (error) {
        console.error('Error fetching odds:', error);
        
        // If API key is invalid, return mock data
        if (error.response?.status === 401) {
            const { sport = 'upcoming', market = 'h2h' } = req.query;
            const mockOdds = generateMockOddsData(sport, market);
            
            res.json({
                success: true,
                data: mockOdds,
                remaining_requests: 'Mock Data',
                used_requests: 'Mock Data',
                note: 'Using mock data due to invalid API key'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.response?.data || error.message
            });
        }
    }
});

// Get odds for specific sport
app.get('/api/odds/:sport', async (req, res) => {
    try {
        const { sport } = req.params;
        const { region = 'us', market = 'h2h', oddsFormat = 'american', dateFormat = 'iso' } = req.query;

        const response = await axios.get(`${ODDS_API_BASE_URL}/sports/${sport}/odds`, {
            params: {
                apiKey: ODDS_API_KEY,
                regions: region,
                markets: market,
                oddsFormat: oddsFormat,
                dateFormat: dateFormat
            }
        });

        res.json({
            success: true,
            data: response.data,
            remaining_requests: response.headers['x-requests-remaining'],
            used_requests: response.headers['x-requests-used']
        });

    } catch (error) {
        console.error('Error fetching odds for sport:', error);
        
        // If API key is invalid, return mock data
        if (error.response?.status === 401) {
            const { sport } = req.params;
            const { market = 'h2h' } = req.query;
            const mockOdds = generateMockOddsData(sport, market);
            
            res.json({
                success: true,
                data: mockOdds,
                remaining_requests: 'Mock Data',
                used_requests: 'Mock Data',
                note: 'Using mock data due to invalid API key'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.response?.data || error.message
            });
        }
    }
});

// Get logs endpoint for dashboard
app.get('/api/logs', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const { limit = 100, from, to, logId } = req.query;
        const collection = db.collection('user_logs');
        
        // Build filter
        const filter = {};
        
        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = parseInt(from);
            if (to) filter.timestamp.$lte = parseInt(to);
        }
        
        if (logId) {
            filter.logId = parseInt(logId);
        }

        const logs = await collection
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();

        // Convert to Torn API format with enhanced data
        const logsObject = {};
        logs.forEach(log => {
            logsObject[log.logId] = {
                logId: log.logId.toString(),
                timestamp: log.timestamp.toString(),
                centralTime: log.centralTime || null,
                data: log.data || {},
                title: log.title || '',
                category: log.category || '',
                dayOfWeek: log.dayOfWeek || '',
                month: log.month || '',
                year: log.year || null
            };
        });

        res.json({
            success: true,
            log: logsObject,
            totalLogs: logs.length,
            totalInDatabase: await collection.countDocuments()
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get logs statistics
app.get('/api/logs/stats', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const collection = db.collection('user_logs');
        
        // Get basic stats
        const totalLogs = await collection.countDocuments();
        const latestLog = await collection.find({}).sort({ timestamp: -1 }).limit(1).toArray();
        const earliestLog = await collection.find({}).sort({ timestamp: 1 }).limit(1).toArray();
        
        // Get logs by day of week
        const dayStats = await collection.aggregate([
            { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        // Get logs by month
        const monthStats = await collection.aggregate([
            { $group: { _id: '$month', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        res.json({
            success: true,
            stats: {
                totalLogs,
                latestLog: latestLog[0] || null,
                earliestLog: earliestLog[0] || null,
                dayStats,
                monthStats
            }
        });
    } catch (error) {
        console.error('Error fetching logs stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get restructured logs
app.get('/api/logs/restructured', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const { limit = 100, event_type, event_category, from, to } = req.query;
        const collection = db.collection('user_logs_restructured');
        
        // Build filter
        const filter = {};
        
        if (event_type) {
            filter['event.type'] = event_type;
        }
        
        if (event_category) {
            filter['event.category'] = event_category;
        }
        
        if (from || to) {
            filter['event.timestamp'] = {};
            if (from) filter['event.timestamp'].$gte = parseInt(from);
            if (to) filter['event.timestamp'].$lte = parseInt(to);
        }

        const logs = await collection
            .find(filter)
            .sort({ 'event.timestamp': -1 })
            .limit(parseInt(limit))
            .toArray();

        res.json({
            success: true,
            logs: logs,
            totalLogs: logs.length,
            totalInDatabase: await collection.countDocuments()
        });
    } catch (error) {
        console.error('Error fetching restructured logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get restructured logs statistics
app.get('/api/logs/restructured/stats', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }

        const collection = db.collection('user_logs_restructured');
        
        // Get basic stats
        const totalLogs = await collection.countDocuments();
        const latestLog = await collection.find({}).sort({ 'event.timestamp': -1 }).limit(1).toArray();
        const earliestLog = await collection.find({}).sort({ 'event.timestamp': 1 }).limit(1).toArray();
        
        // Get logs by event category
        const categoryStats = await collection.aggregate([
            { $group: { _id: '$event.category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        // Get logs by event type
        const typeStats = await collection.aggregate([
            { $group: { _id: '$event.type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();
        
        // Get logs by day of week
        const dayStats = await collection.aggregate([
            { $group: { _id: '$metadata.processed_time.day_of_week', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        res.json({
            success: true,
            stats: {
                totalLogs,
                latestLog: latestLog[0] || null,
                earliestLog: earliestLog[0] || null,
                categoryStats,
                typeStats,
                dayStats
            }
        });
    } catch (error) {
        console.error('Error fetching restructured logs stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
async function startServer() {
    try {
        await connectToMongoDB();

app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 MongoDB Test Page: http://localhost:${PORT}/mongo-test`);
            console.log(`🎲 Odds API Test Page: http://localhost:${PORT}/odds-test`);
            console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 