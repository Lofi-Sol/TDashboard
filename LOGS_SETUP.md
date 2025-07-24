# Torn City Logs Collection Setup

## Overview

This setup automatically collects Torn City user logs and stores them in MongoDB for analysis and dashboard integration.

## Features

- **Automatic Collection**: Runs 3 times per hour via GitHub Actions
- **Duplicate Prevention**: Only collects new logs using timestamp tracking
- **Rich Metadata**: Adds day of week, month, year, and collection timestamps
- **Database Indexing**: Optimized indexes for fast queries
- **API Integration**: Provides REST endpoints for dashboard access

## Schedule

The logs collection runs at:
- **0 minutes past every hour**
- **20 minutes past every hour** 
- **40 minutes past every hour**

This schedule avoids conflicts with the stock data collection which runs at specific hours (0, 2, 4, 8, 10, 12, 14, 16, 18, 20, 22).

## Database Schema

### Collection: `user_logs`

```javascript
{
  logId: Number,           // Torn API log ID
  timestamp: Number,       // Unix timestamp
  title: String,          // Log title
  category: String,       // Log category
  data: Object,           // Log data from Torn API
  date: Date,             // JavaScript Date object
  dayOfWeek: String,      // e.g., "Monday"
  month: String,          // e.g., "January"
  year: Number,           // e.g., 2025
  collectionType: String, // "automatic" or "test"
  collectedAt: Date       // When this record was collected
}
```

### Indexes

- `{ logId: 1, timestamp: 1 }` (unique) - Prevents duplicates
- `{ timestamp: -1 }` - For time-based queries
- `{ logId: 1 }` - For log ID lookups
- `{ dayOfWeek: 1 }` - For day-of-week analysis
- `{ month: 1 }` - For monthly analysis
- `{ year: 1 }` - For yearly analysis

## API Endpoints

### GET `/api/logs`
Returns logs with optional filtering:

**Query Parameters:**
- `limit` (default: 100) - Number of logs to return
- `from` - Start timestamp
- `to` - End timestamp
- `logId` - Specific log ID

**Response:**
```json
{
  "success": true,
  "log": {
    "12345": {
      "logId": "12345",
      "timestamp": "1753331832",
      "data": {},
      "title": "Log Title",
      "category": "category"
    }
  },
  "totalLogs": 100,
  "totalInDatabase": 1500
}
```

### GET `/api/logs/stats`
Returns collection statistics:

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalLogs": 1500,
    "latestLog": { /* log object */ },
    "earliestLog": { /* log object */ },
    "dayStats": [
      { "_id": "Monday", "count": 250 },
      { "_id": "Tuesday", "count": 230 }
    ],
    "monthStats": [
      { "_id": "January", "count": 500 },
      { "_id": "February", "count": 450 }
    ]
  }
}
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
TORN_API_KEY=your_torn_api_key_here
```

### 2. GitHub Secrets

Add these secrets to your GitHub repository:
- `MONGODB_URI` - Your MongoDB connection string
- `TORN_API_KEY` - Your Torn City API key

### 3. Test Setup

Run the test script to verify everything works:
```bash
node scripts/test-logs-setup.js
```

### 4. Manual Test

Test the logs collection manually:
```bash
node scripts/pull-logs.js
```

## Files

- `.github/workflows/pull-logs.yml` - GitHub Actions workflow
- `scripts/pull-logs.js` - Main logs collection script
- `scripts/test-logs.js` - Test script for logs collection
- `scripts/test-logs-setup.js` - Database setup test
- `server.js` - API endpoints for logs data

## Monitoring

### GitHub Actions
Monitor the workflow runs in the "Actions" tab of your GitHub repository.

### Database Monitoring
Check logs collection stats:
```bash
node scripts/test-logs.js
```

### API Testing
Test the API endpoints:
```bash
curl http://localhost:3000/api/logs/stats
curl http://localhost:3000/api/logs?limit=10
```

## Troubleshooting

### Common Issues

1. **TORN_API_KEY not found**
   - Ensure the API key is set in GitHub secrets
   - Check that the key has the necessary permissions

2. **MongoDB connection failed**
   - Verify the MongoDB URI is correct
   - Check network connectivity
   - Ensure the database user has write permissions

3. **No new logs collected**
   - This is normal if no new activity has occurred
   - Check the latest log timestamp in the database
   - Verify the API key is working

4. **Duplicate logs**
   - The unique index should prevent this
   - Check for any manual data insertion that bypassed the script

### Log Analysis

The logs collection provides rich data for analysis:
- Activity patterns by day of week
- Monthly trends
- Yearly comparisons
- Real-time activity monitoring

This data can be integrated into the dashboard for comprehensive Torn City activity tracking. 