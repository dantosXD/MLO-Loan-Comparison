/**
 * Client Management Tool - Simplified client tracking for loan officers
 * Provides centralized client management with notes, scenarios, and reminders
 */

import { ClientManagementPlugin } from '../core/plugins/ClientManagementPlugin';
import { 
  ClientContact, 
  ClientNote, 
  ClientScenario, 
  ClientReminder, 
  ClientSummary,
  ClientManagementState,
  ClientActivity
} from '../types/client';

export class ClientManagementTool {
  private clientPlugin: ClientManagementPlugin;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.clientPlugin = new ClientManagementPlugin({
      enableReminders: true,
      enableProgressTracking: true,
      enableActivityLog: true,
      autoSaveInterval: 30000,
      maxNotesPerClient: 100,
      maxScenariosPerClient: 20
    });

    this.setupEventListeners();
  }

  public getMetadata() {
    return {
      id: 'client-management',
      name: 'Client Management',
      version: '1.0.0',
      description: 'Comprehensive client management system for loan officers with notes, scenarios, reminders, and progress tracking',
      category: 'general',
      tags: ['clients', 'crm', 'loan-officer', 'tracking', 'notes', 'reminders'],
      author: 'Loan Comparison Tool',
      supportedFormats: ['json'],
      requiredPermissions: ['storage'],
      dependencies: [],
      isActive: true,
      lastUsed: new Date().toISOString(),
      usageCount: 0
    };
  }

  public getData(): ClientManagementState {
    return this.clientPlugin.getState();
  }

  public setData(data: Partial<ClientManagementState>): void {
    this.clientPlugin.setState(data);
  }

  public reset(): void {
    this.clientPlugin.reset();
  }

  // Client operations
  public addClient(clientData: Omit<ClientContact, 'id' | 'createdAt' | 'updatedAt'>): ClientContact {
    return this.clientPlugin.addClient(clientData);
  }

  public updateClient(clientId: string, updates: Partial<ClientContact>): boolean {
    return this.clientPlugin.updateClient(clientId, updates);
  }

  public removeClient(clientId: string): boolean {
    return this.clientPlugin.removeClient(clientId);
  }

  public getClient(clientId: string): ClientContact | null {
    return this.clientPlugin.getClient(clientId);
  }

  public getAllClients(): ClientContact[] {
    return this.clientPlugin.getAllClients();
  }

  public searchClients(query: string): ClientContact[] {
    return this.clientPlugin.searchClients(query);
  }

  public selectClient(clientId: string): void {
    this.clientPlugin.setState({ selectedClientId: clientId });
  }

  public getSelectedClient(): ClientContact | null {
    const state = this.clientPlugin.getState();
    return state.selectedClientId ? this.getClient(state.selectedClientId) : null;
  }

  // Notes operations
  public addNote(clientId: string, noteData: Omit<ClientNote, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): ClientNote {
    return this.clientPlugin.addNote(clientId, noteData);
  }

  public updateNote(noteId: string, updates: Partial<ClientNote>): boolean {
    return this.clientPlugin.updateNote(noteId, updates);
  }

  public removeNote(noteId: string): boolean {
    return this.clientPlugin.removeNote(noteId);
  }

  public getClientNotes(clientId: string): ClientNote[] {
    return this.clientPlugin.getClientNotes(clientId);
  }

  // Scenario operations
  public addScenario(clientId: string, scenarioData: Omit<ClientScenario, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): ClientScenario {
    return this.clientPlugin.addScenario(clientId, scenarioData);
  }

  public updateScenario(scenarioId: string, updates: Partial<ClientScenario>): boolean {
    return this.clientPlugin.updateScenario(scenarioId, updates);
  }

  public removeScenario(scenarioId: string): boolean {
    return this.clientPlugin.removeScenario(scenarioId);
  }

  public getClientScenarios(clientId: string): ClientScenario[] {
    return this.clientPlugin.getClientScenarios(clientId);
  }

  public getScenario(scenarioId: string): ClientScenario | null {
    return this.clientPlugin.getScenario(scenarioId);
  }

  // Reminder operations
  public addReminder(clientId: string, reminderData: Omit<ClientReminder, 'id' | 'clientId' | 'createdAt'>): ClientReminder {
    return this.clientPlugin.addReminder(clientId, reminderData);
  }

  public updateReminder(reminderId: string, updates: Partial<ClientReminder>): boolean {
    return this.clientPlugin.updateReminder(reminderId, updates);
  }

  public completeReminder(reminderId: string): boolean {
    return this.clientPlugin.completeReminder(reminderId);
  }

  public getClientReminders(clientId: string): ClientReminder[] {
    return this.clientPlugin.getClientReminders(clientId);
  }

  public getPendingReminders(): ClientReminder[] {
    return this.clientPlugin.getPendingReminders();
  }

  public getOverdueReminders(): ClientReminder[] {
    return this.clientPlugin.getOverdueReminders();
  }

  // Progress tracking
  public updateClientProgress(clientId: string, progressData: any): boolean {
    return this.clientPlugin.updateClientProgress(clientId, progressData);
  }

  public getClientProgress(clientId: string): any {
    return this.clientPlugin.getClientProgress(clientId);
  }

  public addMilestone(clientId: string, milestone: any): boolean {
    return this.clientPlugin.addMilestone(clientId, milestone);
  }

  public completeMilestone(clientId: string, milestoneId: string): boolean {
    return this.clientPlugin.completeMilestone(clientId, milestoneId);
  }

  // Summary and reporting
  public getClientSummary(clientId: string): ClientSummary | null {
    return this.clientPlugin.getClientSummary(clientId);
  }

  public getDashboardData(): {
    totalClients: number;
    activeScenarios: number;
    pendingReminders: number;
    overdueReminders: number;
    recentActivity: any[];
    upcomingReminders: ClientReminder[];
  } {
    const clients = this.getAllClients();
    const pendingReminders = this.getPendingReminders();
    const overdueReminders = this.getOverdueReminders();

    let activeScenarios = 0;
    let recentActivity: any[] = [];

    clients.forEach(client => {
      const scenarios = this.getClientScenarios(client.id);
      activeScenarios += scenarios.filter(s => s.status === 'active').length;
      
      const activities = this.clientPlugin.getClientActivities(client.id, 5);
      recentActivity.push(...activities);
    });

    // Sort recent activity by date
    recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    recentActivity = recentActivity.slice(0, 10);

    // Get upcoming reminders (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingReminders = pendingReminders.filter(r => 
      new Date(r.dueDate) <= nextWeek
    ).slice(0, 5);

    return {
      totalClients: clients.length,
      activeScenarios,
      pendingReminders: pendingReminders.length,
      overdueReminders: overdueReminders.length,
      recentActivity,
      upcomingReminders
    };
  }

  // View management
  public setActiveView(view: ClientManagementState['activeView']): void {
    this.clientPlugin.setState({ activeView: view });
  }

  public getActiveView(): ClientManagementState['activeView'] {
    return this.clientPlugin.getState().activeView;
  }

  public setFilters(filters: ClientManagementState['filters']): void {
    this.clientPlugin.setState({ filters });
  }

  public getFilters(): ClientManagementState['filters'] {
    return this.clientPlugin.getState().filters;
  }

  public setSearchQuery(query: string): void {
    this.clientPlugin.setState({ searchQuery: query });
  }

  public getSearchQuery(): string {
    return this.clientPlugin.getState().searchQuery;
  }

  // Event handling
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in client management event callback for ${event}:`, error);
        }
      });
    }
  }

  // Event handling
  private setupEventListeners(): void {
    this.clientPlugin.on('stateChanged', () => {
      this.emit('stateChanged');
    });

    this.clientPlugin.on('clientAdded', (client: ClientContact) => {
      this.emit('clientAdded', client);
    });

    this.clientPlugin.on('scenarioAdded', (scenario: ClientScenario) => {
      this.emit('scenarioAdded', scenario);
    });

    this.clientPlugin.on('reminderAdded', (reminder: ClientReminder) => {
      this.emit('reminderAdded', reminder);
    });
  }

  // Activity management
  public addActivity(clientId: string, activityData: Omit<ClientActivity, 'id' | 'clientId' | 'createdAt'>): ClientActivity {
    return this.clientPlugin.addActivity(clientId, activityData);
  }

  public updateActivity(activityId: string, updates: Partial<ClientActivity>): boolean {
    return this.clientPlugin.updateActivity(activityId, updates);
  }

  public deleteActivity(activityId: string): boolean {
    return this.clientPlugin.deleteActivity(activityId);
  }

  public getClientActivities(clientId: string, limit?: number): ClientActivity[] {
    return this.clientPlugin.getClientActivities(clientId, limit);
  }

  public getAllActivities(): ClientActivity[] {
    return this.clientPlugin.getAllActivities();
  }

  public getActivity(activityId: string): ClientActivity | null {
    return this.clientPlugin.getActivity(activityId);
  }

  // Integration with loan comparison
  public createScenarioFromLoanData(clientId: string, scenarioName: string, loanData: any): ClientScenario {
    return this.addScenario(clientId, {
      name: scenarioName,
      description: `Loan scenario created on ${new Date().toLocaleDateString()}`,
      loanData,
      status: 'draft',
      priority: 'medium'
    });
  }

  public updateScenarioLoanData(scenarioId: string, loanData: any): boolean {
    return this.updateScenario(scenarioId, { loanData });
  }

  public getScenarioLoanData(scenarioId: string): any {
    const scenario = this.getScenario(scenarioId);
    return scenario?.loanData || null;
  }
}
