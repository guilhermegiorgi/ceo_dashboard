import React, { useState } from 'react';
import { Bell, Check, Trash2, Settings, Filter, Search, X } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: string;
  read: boolean;
}

interface NotificationsModalProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ notifications, onClose }) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const typeConfig = {
    insight: { color: 'text-purple-400', bg: 'bg-purple-500/10' },
    session: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    decision: { color: 'text-green-400', bg: 'bg-green-500/10' },
    system: { color: 'text-orange-400', bg: 'bg-orange-500/10' }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || notification.type === filter;
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleMarkAsRead = (id: number) => {
    // In a real app, this would update the notification status
    console.log('Marking notification as read:', id);
  };

  const handleMarkAllAsRead = () => {
    // In a real app, this would mark all notifications as read
    console.log('Marking all notifications as read');
  };

  const handleDeleteNotification = (id: number) => {
    // In a real app, this would delete the notification
    console.log('Deleting notification:', id);
  };

  return (
    <div className="fixed top-16 right-6 w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-slate-400" />
          <h3 className="text-white font-medium">Notifications</h3>
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {notifications.filter(n => !n.read).length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search and Filter */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Types</option>
            <option value="insight">Insights</option>
            <option value="session">Sessions</option>
            <option value="decision">Decisions</option>
            <option value="system">System</option>
          </select>
          
          <button
            onClick={handleMarkAllAsRead}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No notifications found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type as keyof typeof typeConfig] || typeConfig.system;
              
              return (
                <div 
                  key={notification.id} 
                  className={`p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    !notification.read ? 'bg-slate-700/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${config.bg} ${config.color}`} />
                        <h4 className="text-white text-sm font-medium truncate">{notification.title}</h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mb-2 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">{notification.time}</span>
                        <div className="flex space-x-1">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">
            {filteredNotifications.length} notifications
          </span>
          <button className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm transition-colors">
            <Settings className="h-3 w-3" />
            <span>Notification Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;