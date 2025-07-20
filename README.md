# Torn City Stock Data Collector

This project automatically collects stock market data from Torn City at scheduled intervals and stores it in MongoDB for analysis and tracking.

## Features

- **Automated Data Collection**: Collects stock data 10 times per day via GitHub Actions
- **MongoDB Storage**: Stores historical stock data with timestamps
- **Local Backups**: Maintains local JSON backups of collected data
- **Dashboard Integration**: Provides data for the Torn City dashboard

## Schedule

The data collection runs at the following times (UTC):
- **8:00 AM** - Start of day
- **8:00 PM** - End of day  
- **10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM, 6:00 PM, 10:00 PM, 2:00 AM, 4:00 AM** - Throughout the day

## Setup Instructions

### 1. GitHub Repository Setup

1. Fork or clone this repository to your GitHub account
2. Ensure the repository has the following structure:
   ```
   ├── .github/workflows/stock-data-collector.yml
   ├── scripts/collect-stock-data.js
   ├── package.json
   ├── .gitignore
   └── data/
   ```

### 2. GitHub Secrets Configuration

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add the following secrets:

#### Required Secrets:
- **`MONGODB_URI`**: Your MongoDB connection string
  ```
  mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData
  ```

- **`TORN_API_KEY`**: Your Torn City API key
  - Get this from: https://www.torn.com/preferences.php#tab=api
  - Make sure it has access to the `torn` endpoint

### 3. Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb+srv://oowol003:TornData2341@torndata.vxouoj6.mongodb.net/?retryWrites=true&w=majority&appName=TornData
   TORN_API_KEY=your_torn_api_key_here
   ```

3. Test the data collection script:
   ```bash
   node scripts/collect-stock-data.js
   ```

### 4. Manual Workflow Trigger

You can manually trigger the data collection:
1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **Torn City Stock Data Collector**
4. Click **Run workflow**

## Data Structure

### MongoDB Collection: `stock_prices`

Each document contains:
```json
{
  "stock_id": "1",
  "name": "Stock Name",
  "acronym": "STK",
  "current_price": 150.50,
  "market_cap": 1505000000,
  "total_shares": 10000000,
  "investors": 1250,
  "benefit": {
    "type": "Money",
    "description": "Weekly money payout",
    "requirement": 1000,
    "frequency": 7
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

### Local Data Files

- `data/latest-stock-data.json` - Most recent data collection
- `data/stock-data-YYYY-MM-DDTHH-MM-SS-sssZ.json` - Historical backups

## Database Indexes

The following indexes are automatically created for optimal query performance:
- `{ stock_id: 1, timestamp: -1 }` - For stock-specific historical queries
- `{ timestamp: -1 }` - For time-based queries

## Monitoring

### GitHub Actions Logs
- Check the **Actions** tab in your repository
- View logs for each workflow run
- Monitor for any API errors or connection issues

### MongoDB Monitoring
- Monitor your MongoDB Atlas dashboard for:
  - Collection size growth
  - Query performance
  - Connection usage

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure your Torn API key is valid and has proper permissions
   - Check the API key hasn't expired

2. **MongoDB Connection Issues**
   - Verify the connection string is correct
   - Check if your IP is whitelisted in MongoDB Atlas
   - Ensure the database user has write permissions

3. **GitHub Actions Failures**
   - Check the workflow logs for specific error messages
   - Verify all secrets are properly configured
   - Ensure the repository has proper permissions

### Error Handling

The script includes comprehensive error handling:
- API request failures
- JSON parsing errors
- MongoDB connection issues
- File system errors (for local backups)

## Data Usage

The collected data can be used for:
- Historical price analysis
- Stock performance tracking
- Market trend analysis
- Dashboard visualizations
- Trading strategy development

## Security Notes

- Never commit API keys or database credentials to the repository
- Use GitHub Secrets for sensitive configuration
- Regularly rotate your Torn API key
- Monitor MongoDB access logs for unusual activity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 