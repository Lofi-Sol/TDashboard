# MongoDB Stock Data Test Page

This is a test page to connect to and display Torn City stock data from your MongoDB database.

## Features

- **Real-time Data**: Connects to your MongoDB database and displays actual stock data
- **Filtering**: Filter by stock, time block, day of week, and collection type
- **Sorting**: Click any column header to sort the data
- **Statistics**: Shows total records, unique stocks, latest update, and time blocks
- **Dashboard Styling**: Matches the design of your main Torn dashboard

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Access the Test Page**:
   - Open your browser and go to: `http://localhost:3000/mongo-test`
   - Or visit: `http://localhost:3000/health` to check server status

## API Endpoints

The server provides several API endpoints:

- `POST /api/stock-data` - Get filtered stock data
- `GET /api/stock-data/latest` - Get latest stock data
- `GET /api/stats` - Get database statistics
- `GET /api/stocks` - Get unique stocks list
- `GET /api/stock/:stockId/history` - Get stock price history
- `GET /health` - Health check

## Data Structure

Each stock record includes:

```json
{
  "stock_id": "1",
  "name": "Stock Name",
  "acronym": "STK",
  "current_price": 150.50,
  "yesterday_first_price": 149.80,
  "market_cap": 1505000000,
  "total_shares": 10000000,
  "investors": 1250,
  "benefit": { ... },
  "timestamp": "2025-07-20T03:08:10.107Z",
  "time_block": 3,
  "central_time": "21:08",
  "day_of_week": "Sunday",
  "month_name": "July",
  "year": 2025,
  "month_number": 7,
  "day_of_month": 20,
  "hour_utc": 3,
  "minute_utc": 8,
  "collection_type": "automatic"
}
```

### Price Comparison Features

The API automatically calculates and includes:
- **Previous Start Price**: The first price from yesterday's Block 1, or the earliest available price if yesterday's data isn't available
- **Price Change**: Both dollar amount and percentage change from the previous start price
- **Visual Indicators**: Green for positive changes, red for negative changes

## Time Blocks

The data is organized into 10 time blocks:

- **Block 1**: 8:00-10:00 AM UTC (Start of day)
- **Block 2**: 10:00-12:00 PM UTC
- **Block 3**: 12:00-2:00 PM UTC
- **Block 4**: 2:00-4:00 PM UTC
- **Block 5**: 4:00-6:00 PM UTC
- **Block 6**: 6:00-8:00 PM UTC
- **Block 7**: 8:00-10:00 PM UTC
- **Block 8**: 10:00 PM-2:00 AM UTC
- **Block 9**: 2:00-4:00 AM UTC
- **Block 10**: 4:00-8:00 AM UTC (End of day)

## Collection Types

- **Automatic**: Data collected by GitHub Actions workflow
- **Manual**: Data collected manually using the collection script

## Usage

1. **Load Data**: Click "Load Data" to fetch data with current filters
2. **Latest Data**: Click "Latest Data" to get only the most recent data point
3. **Filter**: Use the dropdown menus to filter by specific criteria
4. **Sort**: Click column headers to sort the table
5. **Limit**: Set the number of records to display (1-1000)

## Troubleshooting

- **Server not starting**: Check if port 3000 is available
- **Database connection error**: Verify your MongoDB connection string
- **No data displayed**: Check if your GitHub Actions workflow has collected data
- **API errors**: Check the browser console for detailed error messages

## Integration

This test page demonstrates how to:
- Connect to MongoDB from a Node.js server
- Create RESTful API endpoints
- Display data in a responsive table
- Implement filtering and sorting
- Match existing dashboard styling

You can use this as a foundation for integrating MongoDB data into your main dashboard. 