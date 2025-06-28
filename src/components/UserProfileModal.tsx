import React, { useState } from 'react';
import { 
  User, 
  X, 
  Edit, 
  Save, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  CreditCard,
  Activity,
  LogOut,
  Key,
  Bell
} from 'lucide-react';

interface UserProfileModalProps {
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'CEO Dashboard Admin',
    email: 'admin@gg-ai-labs.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    title: 'Chief Executive Officer',
    company: 'GG.AI Labs',
    joinDate: '2024-01-01',
    avatar: null as string | null,
    bio: 'Passionate about AI-driven business intelligence and strategic decision making.',
    timezone: 'America/Los_Angeles',
    language: 'en'
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  const handleSaveProfile = () => {
    // In a real app, this would save to the backend
    console.log('Saving profile:', profile);
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const handleAvatarChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfile({ ...profile, avatar: e.target?.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      // In a real app, this would handle sign out
      alert('Signing out...');
      onClose();
    }
  };

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-white" />
            )}
          </div>
          {isEditing && (
            <button
              onClick={handleAvatarChange}
              className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-white">{profile.name}</h3>
          <p className="text-slate-400">{profile.title}</p>
          <p className="text-slate-500 text-sm">{profile.company}</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({...profile, name: e.target.value})}
            disabled={!isEditing}
            className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Job Title</label>
          <input
            type="text"
            value={profile.title}
            onChange={(e) => setProfile({...profile, title: e.target.value})}
            disabled={!isEditing}
            className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              disabled={!isEditing}
              className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg pl-10 pr-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              disabled={!isEditing}
              className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg pl-10 pr-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({...profile, location: e.target.value})}
              disabled={!isEditing}
              className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg pl-10 pr-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
          <input
            type="text"
            value={profile.company}
            onChange={(e) => setProfile({...profile, company: e.target.value})}
            disabled={!isEditing}
            className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
        <textarea
          value={profile.bio}
          onChange={(e) => setProfile({...profile, bio: e.target.value})}
          disabled={!isEditing}
          rows={3}
          className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="flex items-center space-x-2 text-slate-400">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Joined {new Date(profile.joinDate).toLocaleDateString()}</span>
        </div>
        
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
        <p className="text-slate-400 text-sm mb-6">Manage your account security and authentication</p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-white font-medium">Password</h4>
              <p className="text-slate-400 text-sm">Last changed 30 days ago</p>
            </div>
            <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors">
              Change Password
            </button>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-white font-medium">Two-Factor Authentication</h4>
              <p className="text-slate-400 text-sm">Add an extra layer of security</p>
            </div>
            <button className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded text-sm transition-colors">
              Enable 2FA
            </button>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-white font-medium">API Keys</h4>
              <p className="text-slate-400 text-sm">Manage your API access keys</p>
            </div>
            <button className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded text-sm transition-colors">
              Manage Keys
            </button>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Active Sessions</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-slate-600/30 rounded">
              <div>
                <p className="text-white text-sm">Current Session</p>
                <p className="text-slate-400 text-xs">Chrome on macOS • San Francisco, CA</p>
              </div>
              <span className="text-green-400 text-xs">Active</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-600/30 rounded">
              <div>
                <p className="text-white text-sm">Mobile App</p>
                <p className="text-slate-400 text-xs">iOS App • 2 hours ago</p>
              </div>
              <button className="text-red-400 text-xs hover:text-red-300">Revoke</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Billing & Subscription</h3>
        <p className="text-slate-400 text-sm mb-6">Manage your subscription and billing information</p>
      </div>

      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-white font-semibold text-lg">Pro Plan</h4>
            <p className="text-blue-400">$99/month • Billed annually</p>
          </div>
          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">Active</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-slate-400 text-sm">Next billing date</p>
            <p className="text-white">February 1, 2024</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Amount</p>
            <p className="text-white">$1,188.00</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Manage Subscription
          </button>
          <button className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors">
            View Invoices
          </button>
        </div>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Usage This Month</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">API Calls</span>
            <span className="text-white">12,450 / 50,000</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }}></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Storage</span>
            <span className="text-white">2.3 GB / 10 GB</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '23%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Payment Method</h4>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white">•••• •••• •••• 4242</p>
            <p className="text-slate-400 text-sm">Expires 12/26</p>
          </div>
          <button className="ml-auto bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors">
            Update
          </button>
        </div>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Account Activity</h3>
        <p className="text-slate-400 text-sm mb-6">Recent activity and login history</p>
      </div>

      <div className="space-y-4">
        {[
          { action: 'Logged in', time: '2 minutes ago', location: 'San Francisco, CA', device: 'Chrome on macOS' },
          { action: 'Created strategic session', time: '1 hour ago', location: 'San Francisco, CA', device: 'Chrome on macOS' },
          { action: 'Updated profile', time: '3 hours ago', location: 'San Francisco, CA', device: 'Chrome on macOS' },
          { action: 'Generated AI insights', time: '5 hours ago', location: 'San Francisco, CA', device: 'Mobile App' },
          { action: 'Logged in', time: '1 day ago', location: 'San Francisco, CA', device: 'Chrome on macOS' }
        ].map((activity, index) => (
          <div key={index} className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{activity.action}</p>
                <p className="text-slate-400 text-sm">{activity.device} • {activity.location}</p>
              </div>
              <span className="text-slate-500 text-sm">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Account Statistics</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-sm">Total logins</p>
            <p className="text-white text-xl font-semibold">1,247</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Insights generated</p>
            <p className="text-white text-xl font-semibold">3,456</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Decisions recorded</p>
            <p className="text-white text-xl font-semibold">89</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Sessions planned</p>
            <p className="text-white text-xl font-semibold">23</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfile();
      case 'security': return renderSecurity();
      case 'billing': return renderBilling();
      case 'activity': return renderActivity();
      default: return renderProfile();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-700 p-4">
          <div className="flex items-center space-x-2 mb-6">
            <User className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Account</h2>
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

          <div className="mt-8 pt-4 border-t border-slate-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
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
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;