import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Zap, FileText, Users, Target, DollarSign, Trophy, Shield, MapPin, TrendingUp, Clock, Search, BarChart3, Building, Sword, Heart, Calendar, Star, Flag, Activity } from 'lucide-react';

const API_BASE_URL = 'https://api.torn.com/v2';

const endpoints = [
  {
    method: 'GET',
    path: '/faction/applications',
    description: 'Get your faction\'s applications',
    icon: <FileText size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/attacks',
    description: 'Get your faction\'s detailed attacks',
    icon: <Sword size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/attacksfull',
    description: 'Get your faction\'s simplified attacks',
    icon: <Sword size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/balance',
    description: 'Get your faction\'s & member\'s balance details',
    icon: <DollarSign size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/basic',
    description: 'Get your faction\'s basic details',
    icon: <Building size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/basic',
    description: 'Get a faction\'s basic details',
    icon: <Building size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/chain',
    description: 'Get your faction\'s current chain',
    icon: <Target size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/chain',
    description: 'Get a faction\'s current chain',
    icon: <Target size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/chains',
    description: 'Get a list of your faction\'s completed chains',
    icon: <Target size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/chains',
    description: 'Get a list of a faction\'s completed chains',
    icon: <Target size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/chainreport',
    description: 'Get your faction\'s latest chain report',
    icon: <FileText size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{chainId}/chainreport',
    description: 'Get a chain report',
    icon: <FileText size={16} />,
    parameters: [{ name: 'chainId', placeholder: 'Chain ID' }]
  },
  {
    method: 'GET',
    path: '/faction/contributors',
    description: 'Get your faction\'s challenge contributors',
    icon: <Users size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/crimes',
    description: 'Get your faction\'s organized crimes',
    icon: <Shield size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{crimeId}/crime',
    description: 'Get a specific organized crime',
    icon: <Shield size={16} />,
    parameters: [{ name: 'crimeId', placeholder: 'Crime ID' }]
  },
  {
    method: 'GET',
    path: '/faction/hof',
    description: 'Get your faction\'s hall of fame rankings',
    icon: <Trophy size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/hof',
    description: 'Get a faction\'s hall of fame rankings',
    icon: <Trophy size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/members',
    description: 'Get a list of your faction\'s members',
    icon: <Users size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/members',
    description: 'Get a list of a faction\'s members',
    icon: <Users size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/news',
    description: 'Get your faction\'s news details',
    icon: <FileText size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/positions',
    description: 'Get your faction\'s positions details',
    icon: <Users size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/rackets',
    description: 'Get a list of current rackets',
    icon: <Building size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{raidWarId}/raidreport',
    description: 'Get raid war details',
    icon: <Sword size={16} />,
    parameters: [{ name: 'raidWarId', placeholder: 'Raid War ID' }]
  },
  {
    method: 'GET',
    path: '/faction/raids',
    description: 'Get raids history for your faction',
    icon: <Sword size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/raids',
    description: 'Get a faction\'s raids history',
    icon: <Sword size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/rankedwars',
    description: 'Get ranked wars history for your faction',
    icon: <Flag size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/rankedwars',
    description: 'Get a faction\'s ranked wars history',
    icon: <Flag size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/{rankedWarId}/rankedwarreport',
    description: 'Get ranked war details',
    icon: <Flag size={16} />,
    parameters: [{ name: 'rankedWarId', placeholder: 'Ranked War ID' }]
  },
  {
    method: 'GET',
    path: '/faction/reports',
    description: 'Get faction reports',
    icon: <FileText size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/revives',
    description: 'Get your faction\'s detailed revives',
    icon: <Heart size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/revivesFull',
    description: 'Get your faction\'s simplified revives',
    icon: <Heart size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/search',
    description: 'Search factions by name or other criteria',
    icon: <Search size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/stats',
    description: 'Get your faction\'s challenges stats',
    icon: <BarChart3 size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/territory',
    description: 'Get a list of your faction\'s territories',
    icon: <MapPin size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/territory',
    description: 'Get a list of a faction\'s territories',
    icon: <MapPin size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/territoryownership',
    description: 'Get a list of your faction\'s territories',
    icon: <MapPin size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/territorywars',
    description: 'Get territory wars history for your faction',
    icon: <Flag size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/territorywars',
    description: 'Get a faction\'s territory wars history',
    icon: <Flag size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/{territoryWarId}/territorywarreport',
    description: 'Get territory war details',
    icon: <Flag size={16} />,
    parameters: [{ name: 'territoryWarId', placeholder: 'Territory War ID' }]
  },
  {
    method: 'GET',
    path: '/faction/upgrades',
    description: 'Get your faction\'s upgrades',
    icon: <TrendingUp size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/warfare',
    description: 'Get faction warfare',
    icon: <Sword size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/wars',
    description: 'Get your faction\'s wars & pacts details',
    icon: <Flag size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/{id}/wars',
    description: 'Get a faction\'s wars & pacts details',
    icon: <Flag size={16} />,
    parameters: [{ name: 'id', placeholder: 'Faction ID' }]
  },
  {
    method: 'GET',
    path: '/faction/lookup',
    description: 'Faction lookup',
    icon: <Search size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction/timestamp',
    description: 'Get current server time',
    icon: <Clock size={16} />,
    parameters: []
  },
  {
    method: 'GET',
    path: '/faction',
    description: 'Get any Faction selection',
    icon: <Activity size={16} />,
    parameters: []
  }
];

function App() {
  const [apiKey, setApiKey] = useState('Bqpd0nzLWhCQMcA3');
  const [factionId, setFactionId] = useState('53359');
  const [warId, setWarId] = useState('27630');
  const [responses, setResponses] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});

  // Debug: Log initial values
  useEffect(() => {
    console.log('Initial values:', { apiKey, factionId, warId });
  }, []);

  const testEndpoint = async (endpoint) => {
    const endpointKey = endpoint.path;
    
    setLoadingStates(prev => ({ ...prev, [endpointKey]: true }));
    setErrors(prev => ({ ...prev, [endpointKey]: null }));
    setResponses(prev => ({ ...prev, [endpointKey]: null }));

    try {
      let url = `${API_BASE_URL}${endpoint.path}`;
      
      // Replace path parameters
      if (endpoint.path.includes('{id}') && factionId) {
        url = url.replace('{id}', factionId);
      }
      if (endpoint.path.includes('{chainId}') && factionId) {
        url = url.replace('{chainId}', factionId);
      }
      if (endpoint.path.includes('{crimeId}') && factionId) {
        url = url.replace('{crimeId}', factionId);
      }
      if (endpoint.path.includes('{raidWarId}') && warId) {
        url = url.replace('{raidWarId}', warId);
      }
      if (endpoint.path.includes('{rankedWarId}') && warId) {
        url = url.replace('{rankedWarId}', warId);
      }
      if (endpoint.path.includes('{territoryWarId}') && warId) {
        url = url.replace('{territoryWarId}', warId);
      }

      const params = {};
      if (apiKey) {
        params.key = apiKey;
      }

      const result = await axios.get(url, { params });
      setResponses(prev => ({ ...prev, [endpointKey]: result.data }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [endpointKey]: err.response?.data || err.message }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [endpointKey]: false }));
    }
  };

  const getParameterValue = (paramName) => {
    switch (paramName) {
      case 'id':
        return factionId;
      case 'chainId':
        return factionId;
      case 'crimeId':
        return factionId;
      case 'raidWarId':
        return warId;
      case 'rankedWarId':
        return warId;
      case 'territoryWarId':
        return warId;
      default:
        return '';
    }
  };

  const setParameterValue = (paramName, value) => {
    switch (paramName) {
      case 'id':
      case 'chainId':
      case 'crimeId':
        setFactionId(value);
        break;
      case 'raidWarId':
      case 'rankedWarId':
      case 'territoryWarId':
        setWarId(value);
        break;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Torn API Tester</h1>
        <p>Test all Torn API faction endpoints with ease. Enter your API key and parameters to get started.</p>
      </div>

      <div className="api-config">
        <h2>
          <Settings size={20} />
          API Configuration
        </h2>
        <div className="config-grid">
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Torn API key"
            />
          </div>
          <div className="form-group">
            <label>Faction ID</label>
            <input
              type="text"
              value={factionId}
              onChange={(e) => setFactionId(e.target.value)}
              placeholder="Enter faction ID for parameterized endpoints"
            />
          </div>
          <div className="form-group">
            <label>War ID</label>
            <input
              type="text"
              value={warId}
              onChange={(e) => setWarId(e.target.value)}
              placeholder="Enter war ID for war-related endpoints"
            />
          </div>
        </div>
      </div>

      <div className="endpoints-grid">
        {endpoints.map((endpoint, index) => (
          <div key={index} className="endpoint-card">
            <div className="endpoint-header">
              <span className={`method ${endpoint.method.toLowerCase()}`}>
                {endpoint.method}
              </span>
              <span className="endpoint-path">{endpoint.path}</span>
              {endpoint.icon}
            </div>
            <div className="endpoint-description">{endpoint.description}</div>
            
            {endpoint.parameters.length > 0 && (
              <div className="parameter-inputs">
                {endpoint.parameters.map((param, paramIndex) => (
                  <input
                    key={paramIndex}
                    type="text"
                    placeholder={param.placeholder}
                    value={getParameterValue(param.name)}
                    onChange={(e) => setParameterValue(param.name, e.target.value)}
                  />
                ))}
              </div>
            )}
            
            <button
              className="test-button"
              onClick={() => testEndpoint(endpoint)}
              disabled={loadingStates[endpoint.path]}
            >
              {loadingStates[endpoint.path] ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Testing...
                </div>
              ) : (
                <>
                  <Zap size={16} />
                  Test Endpoint
                </>
              )}
            </button>
            
            {/* Response section under each button */}
            {(responses[endpoint.path] || errors[endpoint.path] || loadingStates[endpoint.path]) && (
              <div className="endpoint-response">
                {loadingStates[endpoint.path] && (
                  <div className="loading">
                    <div className="spinner"></div>
                    Making API request...
                  </div>
                )}
                {errors[endpoint.path] && (
                  <div className="response-container error">
                    <strong>Error:</strong> {errors[endpoint.path]}
                  </div>
                )}
                {responses[endpoint.path] && (
                  <div className="response-container success">
                    <strong>Response:</strong>
                    <pre>{JSON.stringify(responses[endpoint.path], null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>


    </div>
  );
}

export default App; 