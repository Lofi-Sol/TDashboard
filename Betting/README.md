# Torn City Ranked Wars Collector

This folder contains the automated ranked wars data collection system for Torn City.

## Files

- `ranked-wars-collector.js` - Main script to collect ranked wars data from Torn API
- `BettingDashboard.html` - Dashboard for viewing betting data
- `README.md` - This documentation file

## Ranked Wars Collector

The ranked wars collector automatically fetches ranked wars data from the Torn City API and stores it in MongoDB with duplicate prevention.

### Features

- **Daily Collection**: Runs automatically once per day at 8 AM UTC via GitHub Actions
- **Duplicate Prevention**: Updates existing war entries instead of creating duplicates
- **MongoDB Storage**: Stores data in the `ranked_wars` collection
- **Local Backups**: Creates timestamped JSON backups in the `data/` folder
- **Error Handling**: Comprehensive error handling and logging

### API Endpoint

Uses the Torn City API endpoint: `https://api.torn.com/v2/?selections=rankedwars`

### Database Schema

Each war document in MongoDB contains:
- `war_id` - Unique identifier for the war
- All original API data from Torn
- `last_updated` - Timestamp of last update
- `created_at` - Timestamp of first creation

### Manual Execution

To run the collector manually:

```bash
# Set environment variables
export MONGODB_URI="your_mongodb_connection_string"
export TORN_API_KEY="your_torn_api_key"

# Run the collector
node Betting/ranked-wars-collector.js
```

### GitHub Actions

The workflow is configured in `.github/workflows/ranked-wars-collector.yml` and:
- Runs daily at 8 AM UTC
- Can be triggered manually via GitHub Actions UI
- Commits backup files to the repository
- Uses the same environment secrets as other workflows

### Environment Variables

Required environment variables:
- `MONGODB_URI` - MongoDB connection string
- `TORN_API_KEY` - Torn City API key

### Data Flow

1. **Fetch**: Collects ranked wars data from Torn API
2. **Process**: Checks for existing wars in MongoDB
3. **Update/Insert**: Updates existing wars or inserts new ones
4. **Backup**: Saves local JSON backup
5. **Commit**: Commits backup files to repository

### Monitoring

Check the GitHub Actions tab to monitor:
- Successful/failed runs
- Number of wars processed
- Update vs insert counts
- Error logs if any issues occur 