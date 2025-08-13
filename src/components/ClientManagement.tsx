/**
 * Client Management React Component
 * Main UI for managing clients, notes, scenarios, and reminders
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  Bell, 
  TrendingUp,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter
} from 'lucide-react';
import { ClientManagementTool } from '../tools/ClientManagementTool';
import { ClientContact, ClientSummary, ClientReminder } from '../types/client';

interface ClientManagementProps {
  tool: ClientManagementTool;
}

export const ClientManagement: React.FC<ClientManagementProps> = ({ tool }) => {
  const [state, setState] = useState(tool.getData());
  const [dashboardData, setDashboardData] = useState(tool.getDashboardData());
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientContact | null>(null);
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredContact: 'email' as const
  });

  useEffect(() => {
    const handleStateChange = () => {
      setState(tool.getData());
      setDashboardData(tool.getDashboardData());
    };

    tool.on('stateChanged', handleStateChange);
    return () => tool.off('stateChanged', handleStateChange);
  }, [tool]);

  const handleAddClient = () => {
    if (newClient.firstName && newClient.lastName) {
      const client = tool.addClient(newClient);
      setNewClient({ firstName: '', lastName: '', email: '', phone: '', preferredContact: 'email' });
      setShowAddClient(false);
      setSelectedClient(client);
      tool.setActiveView('client_detail');
    }
  };

  const handleSelectClient = (client: ClientContact) => {
    setSelectedClient(client);
    tool.selectClient(client.id);
    tool.setActiveView('client_detail');
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Client Dashboard</h2>
        <button
          onClick={() => setShowAddClient(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.totalClients}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Scenarios</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.activeScenarios}</p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Reminders</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingReminders}</p>
            </div>
            <Bell className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{dashboardData.overdueReminders}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {dashboardData.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Upcoming Reminders</h3>
          <div className="space-y-3">
            {dashboardData.upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Bell className="w-4 h-4 text-yellow-500 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-xs text-gray-500">Due: {new Date(reminder.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Clients</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={state.searchQuery}
                  onChange={(e) => tool.setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="divide-y">
          {tool.searchClients(state.searchQuery).map((client) => {
            const summary = tool.getClientSummary(client.id);
            return (
              <div
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className="p-6 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {client.firstName[0]}{client.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{summary?.totalScenarios || 0} scenarios</span>
                      <span>{summary?.pendingReminders || 0} reminders</span>
                      <span className="capitalize">{summary?.currentStage || 'initial_contact'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderClientDetail = () => {
    if (!selectedClient) return null;

    const summary = tool.getClientSummary(selectedClient.id);
    const notes = tool.getClientNotes(selectedClient.id);
    const scenarios = tool.getClientScenarios(selectedClient.id);
    const reminders = tool.getClientReminders(selectedClient.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => tool.setActiveView('dashboard')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Client Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">
                  {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedClient.firstName} {selectedClient.lastName}
                </h2>
                <div className="flex items-center gap-4 text-gray-600 mt-2">
                  {selectedClient.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedClient.email}
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedClient.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Client since {new Date(selectedClient.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm font-medium text-gray-900 capitalize mt-1">
                Stage: {summary?.currentStage || 'initial_contact'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-blue-600">{summary?.totalScenarios || 0}</div>
            <div className="text-sm text-gray-600">Total Scenarios</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-green-600">{summary?.activeScenarios || 0}</div>
            <div className="text-sm text-gray-600">Active Scenarios</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary?.pendingReminders || 0}</div>
            <div className="text-sm text-gray-600">Pending Reminders</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
            <div className="text-2xl font-bold text-red-600">{summary?.overdueReminders || 0}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>

        {/* Tabs for different sections */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium">
                Notes ({notes.length})
              </button>
              <button className="py-4 px-1 text-gray-500 hover:text-gray-700">
                Scenarios ({scenarios.length})
              </button>
              <button className="py-4 px-1 text-gray-500 hover:text-gray-700">
                Reminders ({reminders.length})
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Notes Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notes</h3>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Add Note
                </button>
              </div>
              
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No notes yet. Add your first note to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.slice(0, 5).map((note) => (
                    <div key={note.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{note.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{note.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              note.category === 'important' ? 'bg-red-100 text-red-800' :
                              note.category === 'meeting' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {note.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newClient.firstName}
                  onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newClient.lastName}
                  onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddClient(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                disabled={!newClient.firstName || !newClient.lastName}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {state.activeView === 'dashboard' && renderDashboard()}
      {state.activeView === 'client_detail' && renderClientDetail()}
    </div>
  );
};
