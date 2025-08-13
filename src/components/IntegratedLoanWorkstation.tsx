/**
 * Integrated Loan Workstation - Combines client management with loan comparison
 * Provides seamless workflow between client management and loan analysis
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calculator, 
  Plus, 
  ArrowLeft,
  FileText, 
  TrendingUp,
  User,
  Building,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ClientManagementTool } from '../tools/ClientManagementTool';
import { ClientContact, ClientScenario } from '../types/client';
import { EnhancedLoanComparison } from './EnhancedLoanComparison';
import { AddClientModal } from './AddClientModal';
import { SimpleClientActivities } from './SimpleClientActivities';
import { useActivities, useDataMigration } from '../hooks/useDataPersistence';

interface IntegratedLoanWorkstationProps {
  clientTool: ClientManagementTool;
}

type WorkstationView = 'dashboard' | 'client_list' | 'client_detail' | 'loan_comparison' | 'scenario_detail';

interface WorkstationState {
  currentView: WorkstationView;
  selectedClient: ClientContact | null;
  selectedScenario: ClientScenario | null;
  loanData: any | null;
  isCreatingScenario: boolean;
}

export const IntegratedLoanWorkstation: React.FC<IntegratedLoanWorkstationProps> = ({ clientTool }) => {
  const [state, setState] = useState<WorkstationState>({
    currentView: 'dashboard',
    selectedClient: null,
    selectedScenario: null,
    loanData: null,
    isCreatingScenario: false
  });

  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const [dashboardData, setDashboardData] = useState(clientTool.getDashboardData());
  const [clients, setClients] = useState(clientTool.getAllClients());

  // Data migration hook for session -> client data transfer
  const { migrateToClient } = useDataMigration();

  useEffect(() => {
    const handleStateChange = () => {
      setDashboardData(clientTool.getDashboardData());
      setClients(clientTool.getAllClients());
    };

    clientTool.on('stateChanged', handleStateChange);
    return () => clientTool.off('stateChanged', handleStateChange);
  }, [clientTool]);

  const navigateTo = (view: WorkstationView, options?: { client?: ClientContact; scenario?: ClientScenario; loanData?: any }) => {
    setState(prev => ({
      ...prev,
      currentView: view,
      selectedClient: options?.client || prev.selectedClient,
      selectedScenario: options?.scenario || prev.selectedScenario,
      loanData: options?.loanData || prev.loanData
    }));
  };

  const createLoanComparisonForClient = (client: ClientContact) => {
    setState(prev => ({
      ...prev,
      currentView: 'loan_comparison',
      selectedClient: client,
      selectedScenario: null,
      loanData: null,
      isCreatingScenario: true
    }));
  };

  const saveLoanScenarioForClient = (loanData: any, scenarioName: string) => {
    if (state.selectedClient) {
      const scenario = clientTool.createScenarioFromLoanData(
        state.selectedClient.id,
        scenarioName || `Loan Scenario - ${new Date().toLocaleDateString()}`,
        loanData
      );
      
      navigateTo('client_detail', { 
        client: state.selectedClient, 
        scenario 
      });
    }
  };

  const openExistingScenario = (client: ClientContact, scenario: ClientScenario) => {
    navigateTo('loan_comparison', { 
      client, 
      scenario, 
      loanData: scenario.loanData 
    });
  };

  const handleAddClient = (clientData: Omit<ClientContact, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newClient = clientTool.addClient(clientData);
      setShowAddClientModal(false);
      // Navigate to the new client's detail page
      navigateTo('client_detail', { client: newClient });
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client. Please try again.');
    }
  };

  // Activity management functions - now handled by the data persistence system
  // These will be passed to components that use the useActivities hook

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Loan Officer Workstation</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('client_list')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Clients
          </button>
          <button
            onClick={() => navigateTo('loan_comparison')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            New Loan Analysis
          </button>
        </div>
      </div>

      {/* Quick Stats */}
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
              <p className="text-sm text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.pendingReminders}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
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

      {/* Recent Clients & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Recent Clients</h3>
          <div className="space-y-3">
            {clients.slice(0, 5).map((client) => {
              const summary = clientTool.getClientSummary(client.id);
              return (
                <div
                  key={client.id}
                  onClick={() => navigateTo('client_detail', { client })}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {client.firstName[0]}{client.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.firstName} {client.lastName}</p>
                      <p className="text-sm text-gray-500">{summary?.totalScenarios || 0} scenarios</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createLoanComparisonForClient(client);
                    }}
                    className="text-green-600 hover:text-green-700 p-1"
                    title="Create loan comparison"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Upcoming Tasks</h3>
          <div className="space-y-3">
            {dashboardData.upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-500 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-xs text-gray-500">Due: {new Date(reminder.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientList = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('dashboard')}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
        </div>
        <button
          onClick={() => setShowAddClientModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="divide-y">
          {clients.map((client) => {
            const summary = clientTool.getClientSummary(client.id);
            const scenarios = clientTool.getClientScenarios(client.id);
            return (
              <div key={client.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">
                        {client.firstName[0]}{client.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {client.firstName} {client.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{client.email}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{scenarios.length} scenarios</span>
                        <span>{summary?.pendingReminders || 0} reminders</span>
                        <span className="capitalize">{summary?.currentStage || 'initial_contact'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => createLoanComparisonForClient(client)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                      <Calculator className="w-3 h-3" />
                      New Loan
                    </button>
                    <button
                      onClick={() => navigateTo('client_detail', { client })}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      View Details
                    </button>
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
    if (!state.selectedClient) return null;

    const client = state.selectedClient;
    const scenarios = clientTool.getClientScenarios(client.id);
    const summary = clientTool.getClientSummary(client.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('client_list')}
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {client.firstName} {client.lastName}
            </h2>
          </div>
          <button
            onClick={() => createLoanComparisonForClient(client)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            New Loan Analysis
          </button>
        </div>

        {/* Client Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">
                  {client.firstName[0]}{client.lastName[0]}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {client.firstName} {client.lastName}
                </h3>
                <p className="text-gray-600">{client.email}</p>
                <p className="text-gray-600">{client.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm font-medium text-gray-900 capitalize mt-1">
                Stage: {summary?.currentStage || 'initial_contact'}
              </div>
            </div>
          </div>
        </div>

        {/* Loan Scenarios */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Loan Scenarios ({scenarios.length})</h3>
              <button
                onClick={() => createLoanComparisonForClient(client)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Scenario
              </button>
            </div>
          </div>
          
          {scenarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No loan scenarios yet.</p>
              <button
                onClick={() => createLoanComparisonForClient(client)}
                className="mt-2 text-green-600 hover:text-green-700 font-medium"
              >
                Create your first loan analysis
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          scenario.status === 'active' ? 'bg-green-100 text-green-800' :
                          scenario.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          scenario.status === 'declined' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {scenario.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          scenario.priority === 'high' ? 'bg-red-100 text-red-800' :
                          scenario.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {scenario.priority} priority
                        </span>
                        <span className="text-xs text-gray-500">
                          Updated {new Date(scenario.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openExistingScenario(client, scenario)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Activities - now uses persistent data */}
        <SimpleClientActivities
          client={client}
          clientId={client.id}
        />
      </div>
    );
  };

  const renderLoanComparison = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (state.selectedClient) {
                navigateTo('client_detail', { client: state.selectedClient });
              } else {
                navigateTo('dashboard');
              }
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Loan Comparison</h2>
            {state.selectedClient && (
              <p className="text-gray-600">
                for {state.selectedClient.firstName} {state.selectedClient.lastName}
              </p>
            )}
          </div>
        </div>
        {state.selectedClient && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {state.selectedClient.firstName} {state.selectedClient.lastName}
            </span>
          </div>
        )}
      </div>

      <EnhancedLoanComparison 
        initialData={state.loanData}
        onSave={(loanData) => {
          if (state.selectedClient && state.isCreatingScenario) {
            const scenarioName = prompt('Enter scenario name:') || `Loan Scenario - ${new Date().toLocaleDateString()}`;
            saveLoanScenarioForClient(loanData, scenarioName);
          } else if (state.selectedScenario) {
            clientTool.updateScenarioLoanData(state.selectedScenario.id, loanData);
            navigateTo('client_detail', { client: state.selectedClient! });
          }
        }}
        showSaveToClient={!!state.selectedClient}
        clientName={state.selectedClient ? `${state.selectedClient.firstName} ${state.selectedClient.lastName}` : undefined}
      />
    </div>
  );

  // Main render logic
  const renderContent = () => {
    switch (state.currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'client_list':
        return renderClientList();
      case 'client_detail':
        return renderClientDetail();
      case 'loan_comparison':
        return renderLoanComparison();
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      {renderContent()}
      
      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onSave={handleAddClient}
      />
    </>
  );
};
