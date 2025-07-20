# Torn API Tester

A modern, sophisticated web application for testing Torn API faction endpoints. Built with React and Vite, featuring a clean, minimalist design with no heavy background colors.

## Features

- **Complete API Coverage**: Test all 50+ Torn API faction endpoints
- **Dynamic Parameter Support**: Automatically handle path parameters like faction ID, war ID, etc.
- **Real-time Testing**: Make API calls directly from the interface
- **Beautiful UI**: Modern, responsive design with glassmorphism effects
- **Error Handling**: Clear error messages and response display
- **Loading States**: Visual feedback during API calls
- **Secure**: API key input is masked for security

## Endpoints Included

### Applications
- GET `/faction/applications` - Get your faction's applications

### Attacks
- GET `/faction/attacks` - Get your faction's detailed attacks
- GET `/faction/attacksfull` - Get your faction's simplified attacks

### Balance & Basic Info
- GET `/faction/balance` - Get your faction's & member's balance details
- GET `/faction/basic` - Get your faction's basic details
- GET `/faction/{id}/basic` - Get a faction's basic details

### Chains
- GET `/faction/chain` - Get your faction's current chain
- GET `/faction/{id}/chain` - Get a faction's current chain
- GET `/faction/chains` - Get a list of your faction's completed chains
- GET `/faction/{id}/chains` - Get a list of a faction's completed chains
- GET `/faction/chainreport` - Get your faction's latest chain report
- GET `/faction/{chainId}/chainreport` - Get a chain report

### Members & Positions
- GET `/faction/contributors` - Get your faction's challenge contributors
- GET `/faction/members` - Get a list of your faction's members
- GET `/faction/{id}/members` - Get a list of a faction's members
- GET `/faction/positions` - Get your faction's positions details

### Crimes & Rackets
- GET `/faction/crimes` - Get your faction's organized crimes
- GET `/faction/{crimeId}/crime` - Get a specific organized crime
- GET `/faction/rackets` - Get a list of current rackets

### Hall of Fame & Stats
- GET `/faction/hof` - Get your faction's hall of fame rankings
- GET `/faction/{id}/hof` - Get a faction's hall of fame rankings
- GET `/faction/stats` - Get your faction's challenges stats

### News & Reports
- GET `/faction/news` - Get your faction's news details
- GET `/faction/reports` - Get faction reports

### Wars & Raids
- GET `/faction/raids` - Get raids history for your faction
- GET `/faction/{id}/raids` - Get a faction's raids history
- GET `/faction/{raidWarId}/raidreport` - Get raid war details
- GET `/faction/rankedwars` - Get ranked wars history for your faction
- GET `/faction/{id}/rankedwars` - Get a faction's ranked wars history
- GET `/faction/{rankedWarId}/rankedwarreport` - Get ranked war details
- GET `/faction/wars` - Get your faction's wars & pacts details
- GET `/faction/{id}/wars` - Get a faction's wars & pacts details
- GET `/faction/warfare` - Get faction warfare

### Territory
- GET `/faction/territory` - Get a list of your faction's territories
- GET `/faction/{id}/territory` - Get a list of a faction's territories
- GET `/faction/territoryownership` - Get a list of your faction's territories
- GET `/faction/territorywars` - Get territory wars history for your faction
- GET `/faction/{id}/territorywars` - Get a faction's territory wars history
- GET `/faction/{territoryWarId}/territorywarreport` - Get territory war details

### Upgrades & Search
- GET `/faction/upgrades` - Get your faction's upgrades
- GET `/faction/search` - Search factions by name or other criteria
- GET `/faction/lookup` - Faction lookup

### Revives
- GET `/faction/revives` - Get your faction's detailed revives
- GET `/faction/revivesFull` - Get your faction's simplified revives

### Miscellaneous
- GET `/faction/timestamp` - Get current server time
- GET `/faction` - Get any Faction selection

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd api-tester
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Enter API Key**: Add your Torn API key in the configuration section
2. **Set Parameters**: Enter faction ID and/or war ID as needed for parameterized endpoints
3. **Test Endpoints**: Click "Test Endpoint" on any endpoint card to make an API call
4. **View Results**: See the API response in the results section at the bottom

## API Key

To use this application, you'll need a Torn API key. You can get one by:

1. Going to your Torn profile
2. Navigating to the API section
3. Generating a new API key

**Important**: Keep your API key secure and never share it publicly.

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Validation**: Visual feedback for API calls
- **Error Handling**: Clear error messages for failed requests
- **Loading States**: Spinner animations during API calls
- **Parameter Management**: Automatic parameter substitution in URLs
- **Security**: API key is masked in the input field

## Technology Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons
- **CSS3** - Modern styling with glassmorphism effects

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on the repository. 