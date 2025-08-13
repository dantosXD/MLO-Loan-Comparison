import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { ClientActivity, ClientContact } from '../types/client';
// Using built-in date formatting instead of date-fns to avoid dependency
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

interface ClientActivitiesProps {
  client: ClientContact;
  activities: ClientActivity[];
  onAddActivity: (activity: Omit<ClientActivity, 'id' | 'clientId' | 'createdAt'>) => void;
  onUpdateActivity: (activityId: string, updates: Partial<ClientActivity>) => void;
  onDeleteActivity: (activityId: string) => void;
}

const activityIcons = {
  phone_call: Phone,
  email_sent: Mail,
  email_received: Mail,
  meeting: Calendar,
  text_message: MessageSquare,
  document_sent: FileText,
  document_received: FileText,
  follow_up: Clock,
  note_added: FileText,
  scenario_created: FileText,
  scenario_updated: FileText,
  reminder_set: Clock,
  milestone_completed: CheckCircle,
  contact_updated: Edit
};

const activityColors = {
  phone_call: 'bg-blue-100 text-blue-600',
  email_sent: 'bg-green-100 text-green-600',
  email_received: 'bg-purple-100 text-purple-600',
  meeting: 'bg-orange-100 text-orange-600',
  text_message: 'bg-cyan-100 text-cyan-600',
  document_sent: 'bg-indigo-100 text-indigo-600',
  document_received: 'bg-pink-100 text-pink-600',
  follow_up: 'bg-yellow-100 text-yellow-600',
  note_added: 'bg-gray-100 text-gray-600',
  scenario_created: 'bg-emerald-100 text-emerald-600',
  scenario_updated: 'bg-teal-100 text-teal-600',
  reminder_set: 'bg-amber-100 text-amber-600',
  milestone_completed: 'bg-lime-100 text-lime-600',
  contact_updated: 'bg-rose-100 text-rose-600'
};

const outcomeColors = {
  successful: 'text-green-600 bg-green-50',
  completed: 'text-green-600 bg-green-50',
  no_answer: 'text-yellow-600 bg-yellow-50',
  voicemail: 'text-blue-600 bg-blue-50',
  rescheduled: 'text-orange-600 bg-orange-50',
  pending: 'text-gray-600 bg-gray-50'
};

export const ClientActivities: React.FC<ClientActivitiesProps> = ({
  client,
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ClientActivity | null>(null);

  // Filter and search activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.description.toLowerCase().includes(query) ||
        activity.type.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities, filterType, searchQuery]);

  const getActivityIcon = (type: ClientActivity['type']) => {
    const IconComponent = activityIcons[type] || FileText;
    return IconComponent;
  };

  const formatActivityTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt));
    } catch {
      return new Date(createdAt).toLocaleDateString();
    }
  };

  const communicationTypes = [
    'phone_call',
    'email_sent', 
    'email_received',
    'meeting',
    'text_message',
    'document_sent',
    'document_received',
    'follow_up'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Communication Log</h3>
            <p className="text-sm text-gray-600">
              Track all interactions with {client.firstName} {client.lastName}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Activity
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Activities</option>
              <option value="phone_call">Phone Calls</option>
              <option value="email_sent">Emails Sent</option>
              <option value="email_received">Emails Received</option>
              <option value="meeting">Meetings</option>
              <option value="text_message">Text Messages</option>
              <option value="document_sent">Documents Sent</option>
              <option value="document_received">Documents Received</option>
              <option value="follow_up">Follow-ups</option>
            </select>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="p-6">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No activities found</p>
            <p className="text-sm text-gray-400">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Start logging communication activities with this client'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              const isCommActivity = communicationTypes.includes(activity.type);
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  {/* Activity Icon */}
                  <div className={`p-2 rounded-lg ${activityColors[activity.type] || 'bg-gray-100 text-gray-600'}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 capitalize">
                            {activity.type.replace('_', ' ')}
                          </h4>
                          {activity.outcome && (
                            <span className={`px-2 py-1 text-xs rounded-full ${outcomeColors[activity.outcome]}`}>
                              {activity.outcome.replace('_', ' ')}
                            </span>
                          )}
                          {activity.followUpRequired && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              Follow-up needed
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">{activity.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatActivityTime(activity.createdAt)}</span>
                          {activity.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.duration} min
                            </span>
                          )}
                          {activity.followUpDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Follow-up: {new Date(activity.followUpDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions Menu */}
                      {isCommActivity && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedActivity(activity)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Edit activity"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this activity?')) {
                                onDeleteActivity(activity.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete activity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <AddActivityModal
          client={client}
          onClose={() => setShowAddModal(false)}
          onSave={(activityData) => {
            onAddActivity(activityData);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Activity Modal */}
      {selectedActivity && (
        <EditActivityModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onSave={(updates) => {
            onUpdateActivity(selectedActivity.id, updates);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
};

// Add Activity Modal Component
interface AddActivityModalProps {
  client: ClientContact;
  onClose: () => void;
  onSave: (activity: Omit<ClientActivity, 'id' | 'clientId' | 'createdAt'>) => void;
}

const AddActivityModal: React.FC<AddActivityModalProps> = ({ client, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    type: 'phone_call' as ClientActivity['type'],
    description: '',
    duration: '',
    outcome: 'successful' as ClientActivity['outcome'],
    followUpRequired: false,
    followUpDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const activityData: Omit<ClientActivity, 'id' | 'clientId' | 'createdAt'> = {
      type: formData.type,
      description: formData.description,
      ...(formData.duration && { duration: parseInt(formData.duration) }),
      ...(formData.outcome && { outcome: formData.outcome }),
      followUpRequired: formData.followUpRequired,
      ...(formData.followUpDate && { followUpDate: formData.followUpDate })
    };

    onSave(activityData);
  };

  const communicationTypes = [
    { value: 'phone_call', label: 'Phone Call' },
    { value: 'email_sent', label: 'Email Sent' },
    { value: 'email_received', label: 'Email Received' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'text_message', label: 'Text Message' },
    { value: 'document_sent', label: 'Document Sent' },
    { value: 'document_received', label: 'Document Received' },
    { value: 'follow_up', label: 'Follow-up' }
  ];

  const outcomes = [
    { value: 'successful', label: 'Successful' },
    { value: 'completed', label: 'Completed' },
    { value: 'no_answer', label: 'No Answer' },
    { value: 'voicemail', label: 'Voicemail' },
    { value: 'rescheduled', label: 'Rescheduled' },
    { value: 'pending', label: 'Pending' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Log New Activity</h3>
          <p className="text-sm text-gray-600">
            Record communication with {client.firstName} {client.lastName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ClientActivity['type'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {communicationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the activity..."
              required
            />
          </div>

          {(['phone_call', 'meeting'].includes(formData.type)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value as ClientActivity['outcome'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {outcomes.map(outcome => (
                <option key={outcome.value} value={outcome.value}>{outcome.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={formData.followUpRequired}
              onChange={(e) => setFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="followUpRequired" className="ml-2 text-sm text-gray-700">
              Follow-up required
            </label>
          </div>

          {formData.followUpRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Log Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Activity Modal Component
interface EditActivityModalProps {
  activity: ClientActivity;
  onClose: () => void;
  onSave: (updates: Partial<ClientActivity>) => void;
}

const EditActivityModal: React.FC<EditActivityModalProps> = ({ activity, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    description: activity.description,
    duration: activity.duration?.toString() || '',
    outcome: activity.outcome || 'successful',
    followUpRequired: activity.followUpRequired || false,
    followUpDate: activity.followUpDate || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: Partial<ClientActivity> = {
      description: formData.description,
      ...(formData.duration && { duration: parseInt(formData.duration) }),
      outcome: formData.outcome,
      followUpRequired: formData.followUpRequired,
      ...(formData.followUpDate && { followUpDate: formData.followUpDate })
    };

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Activity</h3>
          <p className="text-sm text-gray-600 capitalize">
            {activity.type.replace('_', ' ')} - {new Date(activity.createdAt).toLocaleDateString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {(['phone_call', 'meeting'].includes(activity.type)) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outcome
            </label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value as ClientActivity['outcome'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="successful">Successful</option>
              <option value="completed">Completed</option>
              <option value="no_answer">No Answer</option>
              <option value="voicemail">Voicemail</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="editFollowUpRequired"
              checked={formData.followUpRequired}
              onChange={(e) => setFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="editFollowUpRequired" className="ml-2 text-sm text-gray-700">
              Follow-up required
            </label>
          </div>

          {formData.followUpRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientActivities;
