import React, { useState, useEffect } from 'react';
import { dataManager } from '../utils/dataManager';
import { useDataPersistence, useDataMigration } from '../hooks/useDataPersistence';
import { Database, User, Users, ArrowRight, Trash2, Eye } from 'lucide-react';

/**
 * Demo component to showcase the unified data persistence system
 * Shows how anonymous users and client sessions are stored and managed
 */
export const DataPersistenceDemo: React.FC = () => {
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [dataSummary, setDataSummary] = useState(dataManager.getDataSummary());
  const [anonymousUsers, setAnonymousUsers] = useState(dataManager.getAllAnonymousUsers());
  const [clientSessions, setClientSessions] = useState(dataManager.getCurrentSessionClientData());

  // Use the data persistence hooks
  const { data: testData, setData: setTestData } = useDataPersistence<string>('testData', '', currentClientId);
  const { migrateToClient, getAnonymousSummary, getClientSessionSummary } = useDataMigration();

  // Refresh data display
  const refreshData = () => {
    setDataSummary(dataManager.getDataSummary());
    setAnonymousUsers(dataManager.getAllAnonymousUsers());
    setClientSessions(dataManager.getCurrentSessionClientData());
  };

  useEffect(() => {
    refreshData();
  }, [currentClientId, testData]);

  const handleSaveTestData = () => {
    const timestamp = new Date().toLocaleTimeString();
    const newData = currentClientId 
      ? `Client ${currentClientId} data saved at ${timestamp}`
      : `Anonymous data saved at ${timestamp}`;
    setTestData(newData);
  };

  const handleSwitchToClient = (clientId: string) => {
    dataManager.setCurrentClient(clientId);
    setCurrentClientId(clientId);
  };

  const handleSwitchToAnonymous = () => {
    dataManager.setCurrentClient(null);
    setCurrentClientId(null);
  };

  const handleMigrateToClient = async () => {
    const clientId = `client_${Date.now()}`;
    await migrateToClient(clientId);
    setCurrentClientId(clientId);
    refreshData();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Data Persistence System Demo
        </h2>
        
        {/* Current Session Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Current Session</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Session ID:</span> {dataSummary.sessionId}
            </div>
            <div>
              <span className="font-medium">Current Client:</span> {currentClientId || 'Anonymous'}
            </div>
            <div>
              <span className="font-medium">Anonymous Data Size:</span> {dataSummary.anonymousDataSize} bytes
            </div>
            <div>
              <span className="font-medium">Client Session Data Size:</span> {dataSummary.clientSessionDataSize} bytes
            </div>
          </div>
        </div>

        {/* Test Data Controls */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Test Data Management</h3>
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={handleSaveTestData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save Test Data
            </button>
            <button
              onClick={handleSwitchToAnonymous}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Switch to Anonymous
            </button>
            <button
              onClick={() => handleSwitchToClient('client_demo')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Switch to Client Demo
            </button>
            <button
              onClick={handleMigrateToClient}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Migrate to New Client
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Current Test Data:</span> {testData || 'No data saved'}
          </div>
        </div>

        {/* Storage Keys */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Active Storage Keys</h3>
          <div className="space-y-1 text-sm font-mono">
            {dataSummary.storageKeys.map((key, index) => (
              <div key={index} className="text-yellow-800">
                {key}
              </div>
            ))}
          </div>
        </div>

        {/* Anonymous Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Anonymous Users ({anonymousUsers.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {anonymousUsers.map((user, index) => (
                <div key={index} className="bg-white rounded p-3 text-sm">
                  <div className="font-medium text-green-800">
                    Session: {user.sessionId}
                  </div>
                  <div className="text-gray-600">
                    Created: {new Date(user.createdAt).toLocaleString()}
                  </div>
                  <div className="text-gray-600">
                    Last Active: {new Date(user.lastAccessed).toLocaleString()}
                  </div>
                  {user.testData && (
                    <div className="text-blue-600 mt-1">
                      Data: {user.testData}
                    </div>
                  )}
                </div>
              ))}
              {anonymousUsers.length === 0 && (
                <div className="text-green-600 text-center py-4">
                  No anonymous users found
                </div>
              )}
            </div>
          </div>

          {/* Client Sessions */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Client Sessions ({clientSessions.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clientSessions.map((session, index) => (
                <div key={index} className="bg-white rounded p-3 text-sm">
                  <div className="font-medium text-purple-800">
                    {session.sessionId}_{session.clientId}
                  </div>
                  <div className="text-gray-600">
                    Client: {session.clientId}
                  </div>
                  <div className="text-gray-600">
                    Created: {new Date(session.createdAt).toLocaleString()}
                  </div>
                  <div className="text-gray-600">
                    Last Active: {new Date(session.lastAccessed).toLocaleString()}
                  </div>
                  {session.testData && (
                    <div className="text-blue-600 mt-1">
                      Data: {session.testData}
                    </div>
                  )}
                </div>
              ))}
              {clientSessions.length === 0 && (
                <div className="text-purple-600 text-center py-4">
                  No client sessions found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Anonymous Storage:</strong> <code>loan_tool_anonymous_[sessionId]</code></p>
            <p><strong>Client Session Storage:</strong> <code>loan_tool_client_session_[sessionId]_[clientId]</code></p>
            <p><strong>Unique Sessions:</strong> Each browser session gets a unique ID that persists across page reloads</p>
            <p><strong>Client Isolation:</strong> Each client within a session has isolated data storage</p>
            <p><strong>Migration:</strong> Anonymous data can be migrated to client sessions seamlessly</p>
          </div>
        </div>
      </div>
    </div>
  );
};
