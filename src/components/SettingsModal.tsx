import React, { useState } from 'react';
import { 
  Settings, 
  X, 
  Database, 
  Key, 
  Palette, 
  Bell, 
  Shield, 
  Download, 
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  AlertTriangle
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('api');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [settings, setSettings] = useState({
    // API Configuration
    obsidianApiUrl: 'http://localhost:27123',
    obsidianApiKey: '••••••••••••••••',
    openaiApiKey: '••••••••••••••••',
    embeddingsApiUrl: 'http://localhost:8000',
    mcpEndpoint: 'ws://localhost:8080/mcp',
    
    // Preferences
    theme: 'dark',
    language: 'en',
    autoRefresh: true,
    refreshInterval: 30,
    enableNotifications: true,
    enableSounds: false,
    
    // Privacy & Security
    enableAnalytics: true,
    shareUsageData: false,
    sessionTimeout: 60,
    enableTwoFactor: false,
    
    // Data Management
    autoBackup: true,
    backupFrequency: 'daily',
    retentionPeriod: 90
  });

  const tabs = [
    { id: 'api', label: 'API Configuration', icon: Key },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database }
  ];

  const handleSaveSettings = () => {
    // In a real app, this would save settings to the backend
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  const handleTestConnection = async (service: string) => {
    // In a real app, this would test the API connection
    console.log('Testing connection to:', service);
    alert(`Testing connection to ${service}...`);
  };

  const handleExportSettings = () => {
    const exportData = {
      settings: { ...settings },
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string);
            setSettings({ ...settings, ...importedData.settings });
            alert('Settings imported successfully!');
          } catch (error) {
            alert('Failed to import settings. Invalid file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      // Reset to default settings
      alert('Settings reset to default values.');
    }
  };

  const renderAPIConfiguration = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
        <p className="text-slate-400 text-sm mb-6">Configure your external service connections</p>
      </div>

      {/* Obsidian API */}
      <div className="bg-slate-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Obsidian API</h4>
          <button
            onClick={() => handleTestConnection('Obsidian')}
            className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test Connection</span>
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">API URL</label>
            <input
              type="text"
              value={settings.obsidianApiUrl}
              onChange={(e) => setSettings({...settings, obsidianApiUrl: e.target.value})}
              className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showApiKeys ? "text" : "password"}
                value={settings.obsidianApiKey}
                onChange={(e) => setSettings({...settings, obsidianApiKey: e.target.value})}
                className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button
                onClick={() => setShowApiKeys(!showApiKeys)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OpenAI API */}
      <div className="bg-slate-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">OpenAI API</h4>
          <button
            onClick={() => handleTestConnection('OpenAI')}
            className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded text-sm transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test Connection</span>
          </button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
          <div className="relative">
            <input
              type={showApiKeys ? "text" : "password"}
              value={settings.openaiApiKey}
              onChange={(e) => setSettings({...settings, openaiApiKey: e.target.value})}
              className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* MCP Configuration */}
      <div className="bg-slate-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">MCP Endpoint</h4>
          <button
            onClick={() => handleTestConnection('MCP')}
            className="flex items-center space-x-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded text-sm transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Test Connection</span>
          </button>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">WebSocket URL</label>
          <input
            type="text"
            value={settings.mcpEndpoint}
            onChange={(e) => setSettings({...settings, mcpEndpoint: e.target.value})}
            className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
        <p className="text-slate-400 text-sm mb-6">Customize your dashboard experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({...settings, theme: e.target.value})}
            className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
          <select
            value={settings.language}
            onChange={(e) => setSettings({...settings, language: e.target.value})}
            className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-300">Auto Refresh</label>
            <p className="text-xs text-slate-400">Automatically refresh data</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(e) => setSettings({...settings, autoRefresh: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.autoRefresh && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Refresh Interval: {settings.refreshInterval} seconds
            </label>
            <input
              type="range"
              min="10"
              max="300"
              value={settings.refreshInterval}
              onChange={(e) => setSettings({...settings, refreshInterval: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
        <p className="text-slate-400 text-sm mb-6">Configure how you receive notifications</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-300">Enable Notifications</label>
            <p className="text-xs text-slate-400">Receive browser notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-300">Sound Notifications</label>
            <p className="text-xs text-slate-400">Play sound for notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableSounds}
              onChange={(e) => setSettings({...settings, enableSounds: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Notification Types</h4>
          <div className="space-y-3">
            {[
              { id: 'insights', label: 'New AI Insights', enabled: true },
              { id: 'sessions', label: 'Strategic Sessions', enabled: true },
              { id: 'decisions', label: 'Decision Updates', enabled: false },
              { id: 'system', label: 'System Alerts', enabled: true }
            ].map((type) => (
              <div key={type.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{type.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={type.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Security & Privacy</h3>
        <p className="text-slate-400 text-sm mb-6">Manage your security and privacy settings</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Session Timeout: {settings.sessionTimeout} minutes
          </label>
          <input
            type="range"
            min="15"
            max="480"
            value={settings.sessionTimeout}
            onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-300">Two-Factor Authentication</label>
            <p className="text-xs text-slate-400">Add extra security to your account</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableTwoFactor}
              onChange={(e) => setSettings({...settings, enableTwoFactor: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-300">Usage Analytics</label>
            <p className="text-xs text-slate-400">Help improve the dashboard</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableAnalytics}
              onChange={(e) => setSettings({...settings, enableAnalytics: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-yellow-400 font-medium">Security Recommendations</h4>
              <ul className="text-sm text-yellow-300 mt-2 space-y-1">
                <li>• Enable two-factor authentication</li>
                <li>• Use strong, unique API keys</li>
                <li>• Regularly rotate your credentials</li>
                <li>• Monitor access logs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataManagement = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
        <p className="text-slate-400 text-sm mb-6">Manage your data backup and retention</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-300">Auto Backup</label>
            <p className="text-xs text-slate-400">Automatically backup your data</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoBackup}
              onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.autoBackup && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
              className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Data Retention: {settings.retentionPeriod} days
          </label>
          <input
            type="range"
            min="30"
            max="365"
            value={settings.retentionPeriod}
            onChange={(e) => setSettings({...settings, retentionPeriod: parseInt(e.target.value)})}
            className="w-full"
          />
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Data Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportSettings}
              className="flex items-center justify-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-2 px-4 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Settings</span>
            </button>
            
            <button
              onClick={handleImportSettings}
              className="flex items-center justify-center space-x-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 px-4 rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import Settings</span>
            </button>
          </div>
          
          <button
            onClick={handleResetSettings}
            className="w-full mt-3 flex items-center justify-center space-x-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 px-4 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'api': return renderAPIConfiguration();
      case 'preferences': return renderPreferences();
      case 'notifications': return renderNotifications();
      case 'security': return renderSecurity();
      case 'data': return renderDataManagement();
      default: return renderAPIConfiguration();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-700 p-4">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-white">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Changes are saved automatically
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;