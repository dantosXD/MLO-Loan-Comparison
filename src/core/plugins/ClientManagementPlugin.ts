/**
 * Client Management Plugin - Extensible client tracking for loan officers
 * Manages clients, scenarios, notes, reminders, and progress tracking
 */

import { 
  ClientContact, 
  ClientNote, 
  ClientScenario, 
  ClientReminder, 
  ClientProgress, 
  ClientActivity,
  ClientSummary,
  ClientManagementState,
  ClientManagementConfig,
  ClientMilestone
} from '../../types/client';

export class ClientManagementPlugin {
  private state: ClientManagementState;
  private config: ClientManagementConfig;
  private listeners: Map<string, Function[]> = new Map();
  private storage: Storage;

  constructor(config: Partial<ClientManagementConfig> = {}) {
    this.storage = localStorage;
    this.config = {
      enableReminders: true,
      enableProgressTracking: true,
      enableActivityLog: true,
      defaultReminderTypes: ['call', 'email', 'meeting', 'document', 'follow_up', 'deadline'],
      defaultScenarioStatuses: ['draft', 'active', 'approved', 'declined', 'closed'],
      autoSaveInterval: 30000,
      maxNotesPerClient: 100,
      maxScenariosPerClient: 20,
      ...config
    };

    this.state = {
      clients: [],
      selectedClientId: undefined,
      activeView: 'dashboard',
      filters: {},
      searchQuery: ''
    };

    this.loadFromStorage();
  }

  // State management
  public getState(): ClientManagementState {
    return { ...this.state };
  }

  public setState(updates: Partial<ClientManagementState>): void {
    this.state = { ...this.state, ...updates };
    this.saveToStorage();
    this.emit('stateChanged', this.state);
  }

  // Client operations
  public addClient(clientData: Omit<ClientContact, 'id' | 'createdAt' | 'updatedAt'>): ClientContact {
    const newClient: ClientContact = {
      ...clientData,
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.setState({
      clients: [...this.state.clients, newClient]
    });

    this.addActivity(newClient.id, 'contact_updated', `Client ${newClient.firstName} ${newClient.lastName} added`);
    this.emit('clientAdded', newClient);
    return newClient;
  }

  public updateClient(clientId: string, updates: Partial<ClientContact>): boolean {
    const clientIndex = this.state.clients.findIndex(client => client.id === clientId);
    if (clientIndex === -1) return false;

    const updatedClients = [...this.state.clients];
    updatedClients[clientIndex] = {
      ...updatedClients[clientIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.setState({ clients: updatedClients });
    this.addActivity(clientId, 'contact_updated', 'Client information updated');
    this.emit('clientUpdated', { clientId, updates });
    return true;
  }

  public removeClient(clientId: string): boolean {
    const client = this.getClient(clientId);
    if (!client) return false;

    // Remove all associated data
    this.removeAllClientData(clientId);

    const updatedClients = this.state.clients.filter(c => c.id !== clientId);
    this.setState({ clients: updatedClients });

    this.emit('clientRemoved', clientId);
    return true;
  }

  public getClient(clientId: string): ClientContact | null {
    return this.state.clients.find(client => client.id === clientId) || null;
  }

  public getAllClients(): ClientContact[] {
    return [...this.state.clients];
  }

  public searchClients(query: string): ClientContact[] {
    if (!query.trim()) return this.getAllClients();

    const searchTerm = query.toLowerCase();
    return this.state.clients.filter(client => 
      client.firstName.toLowerCase().includes(searchTerm) ||
      client.lastName.toLowerCase().includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm) ||
      client.phone?.includes(searchTerm)
    );
  }

  // Notes operations
  public addNote(clientId: string, noteData: Omit<ClientNote, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): ClientNote {
    const newNote: ClientNote = {
      ...noteData,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveNote(newNote);
    this.addActivity(clientId, 'note_added', `Note added: ${noteData.title}`);
    this.emit('noteAdded', newNote);
    return newNote;
  }

  public updateNote(noteId: string, updates: Partial<ClientNote>): boolean {
    const note = this.getNote(noteId);
    if (!note) return false;

    const updatedNote = {
      ...note,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveNote(updatedNote);
    this.emit('noteUpdated', { noteId, updates });
    return true;
  }

  public removeNote(noteId: string): boolean {
    const note = this.getNote(noteId);
    if (!note) return false;

    this.storage.removeItem(`note_${noteId}`);
    this.emit('noteRemoved', noteId);
    return true;
  }

  public getNote(noteId: string): ClientNote | null {
    const noteData = this.storage.getItem(`note_${noteId}`);
    return noteData ? JSON.parse(noteData) : null;
  }

  public getClientNotes(clientId: string): ClientNote[] {
    const notes: ClientNote[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('note_')) {
        const noteData = this.storage.getItem(key);
        if (noteData) {
          const note = JSON.parse(noteData);
          if (note.clientId === clientId) {
            notes.push(note);
          }
        }
      }
    }
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Scenario operations
  public addScenario(clientId: string, scenarioData: Omit<ClientScenario, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>): ClientScenario {
    const newScenario: ClientScenario = {
      ...scenarioData,
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveScenario(newScenario);
    this.addActivity(clientId, 'scenario_created', `Scenario created: ${scenarioData.name}`);
    this.emit('scenarioAdded', newScenario);
    return newScenario;
  }

  public updateScenario(scenarioId: string, updates: Partial<ClientScenario>): boolean {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) return false;

    const updatedScenario = {
      ...scenario,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };

    this.saveScenario(updatedScenario);
    this.addActivity(scenario.clientId, 'scenario_updated', `Scenario updated: ${scenario.name}`);
    this.emit('scenarioUpdated', { scenarioId, updates });
    return true;
  }

  public removeScenario(scenarioId: string): boolean {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) return false;

    this.storage.removeItem(`scenario_${scenarioId}`);
    this.emit('scenarioRemoved', scenarioId);
    return true;
  }

  public getScenario(scenarioId: string): ClientScenario | null {
    const scenarioData = this.storage.getItem(`scenario_${scenarioId}`);
    return scenarioData ? JSON.parse(scenarioData) : null;
  }

  public getClientScenarios(clientId: string): ClientScenario[] {
    const scenarios: ClientScenario[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('scenario_')) {
        const scenarioData = this.storage.getItem(key);
        if (scenarioData) {
          const scenario = JSON.parse(scenarioData);
          if (scenario.clientId === clientId) {
            scenarios.push(scenario);
          }
        }
      }
    }
    return scenarios.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Reminder operations
  public addReminder(clientId: string, reminderData: Omit<ClientReminder, 'id' | 'clientId' | 'createdAt'>): ClientReminder {
    const newReminder: ClientReminder = {
      ...reminderData,
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      createdAt: new Date().toISOString()
    };

    this.saveReminder(newReminder);
    this.emit('reminderAdded', newReminder);
    return newReminder;
  }

  public updateReminder(reminderId: string, updates: Partial<ClientReminder>): boolean {
    const reminder = this.getReminder(reminderId);
    if (!reminder) return false;

    const updatedReminder = { ...reminder, ...updates };
    this.saveReminder(updatedReminder);
    this.emit('reminderUpdated', { reminderId, updates });
    return true;
  }

  public completeReminder(reminderId: string): boolean {
    return this.updateReminder(reminderId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  }

  public getReminder(reminderId: string): ClientReminder | null {
    const reminderData = this.storage.getItem(`reminder_${reminderId}`);
    return reminderData ? JSON.parse(reminderData) : null;
  }

  public getClientReminders(clientId: string): ClientReminder[] {
    const reminders: ClientReminder[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('reminder_')) {
        const reminderData = this.storage.getItem(key);
        if (reminderData) {
          const reminder = JSON.parse(reminderData);
          if (reminder.clientId === clientId) {
            reminders.push(reminder);
          }
        }
      }
    }
    return reminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  public getPendingReminders(): ClientReminder[] {
    const allReminders = this.getAllReminders();
    return allReminders.filter(reminder => 
      reminder.status === 'pending' || reminder.status === 'overdue'
    );
  }

  public getOverdueReminders(): ClientReminder[] {
    const now = new Date();
    const allReminders = this.getAllReminders();
    return allReminders.filter(reminder => 
      reminder.status === 'pending' && new Date(reminder.dueDate) < now
    );
  }

  // Progress tracking
  public updateClientProgress(clientId: string, progressData: Partial<ClientProgress>): boolean {
    const existingProgress = this.getClientProgress(clientId);
    const updatedProgress: ClientProgress = {
      id: existingProgress?.id || `progress_${clientId}`,
      clientId,
      stage: 'initial_contact',
      milestones: [],
      ...existingProgress,
      ...progressData,
      updatedAt: new Date().toISOString()
    };

    this.storage.setItem(`progress_${clientId}`, JSON.stringify(updatedProgress));
    this.emit('progressUpdated', { clientId, progress: updatedProgress });
    return true;
  }

  public getClientProgress(clientId: string): ClientProgress | null {
    const progressData = this.storage.getItem(`progress_${clientId}`);
    return progressData ? JSON.parse(progressData) : null;
  }

  public addMilestone(clientId: string, milestone: Omit<ClientMilestone, 'id'>): boolean {
    const progress = this.getClientProgress(clientId);
    if (!progress) return false;

    const newMilestone: ClientMilestone = {
      ...milestone,
      id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    progress.milestones.push(newMilestone);
    return this.updateClientProgress(clientId, { milestones: progress.milestones });
  }

  public completeMilestone(clientId: string, milestoneId: string): boolean {
    const progress = this.getClientProgress(clientId);
    if (!progress) return false;

    const milestone = progress.milestones.find(m => m.id === milestoneId);
    if (!milestone) return false;

    milestone.status = 'completed';
    milestone.completedDate = new Date().toISOString();

    this.addActivity(clientId, 'milestone_completed', `Milestone completed: ${milestone.name}`);
    return this.updateClientProgress(clientId, { milestones: progress.milestones });
  }

  // Activity logging - overloaded methods
  public addActivity(clientId: string, type: ClientActivity['type'], description: string, metadata?: Record<string, any>): void;
  public addActivity(clientId: string, activityData: Omit<ClientActivity, 'id' | 'clientId' | 'createdAt'>): ClientActivity;
  public addActivity(clientId: string, typeOrData: ClientActivity['type'] | Omit<ClientActivity, 'id' | 'clientId' | 'createdAt'>, description?: string, metadata?: Record<string, any>): void | ClientActivity {
    if (!this.config.enableActivityLog) return;

    let activity: ClientActivity;

    if (typeof typeOrData === 'string') {
      // Legacy signature: addActivity(clientId, type, description, metadata)
      activity = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        type: typeOrData,
        description: description!,
        metadata,
        createdAt: new Date().toISOString()
      };
    } else {
      // New signature: addActivity(clientId, activityData)
      activity = {
        ...typeOrData,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        createdAt: new Date().toISOString()
      };
    }

    this.storage.setItem(`activity_${activity.id}`, JSON.stringify(activity));
    this.emit('activityAdded', activity);

    // Return activity for new signature, void for legacy
    return typeof typeOrData === 'object' ? activity : undefined;
  }

  public getClientActivities(clientId: string, limit: number = 50): ClientActivity[] {
    const activities: ClientActivity[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('activity_')) {
        const activityData = this.storage.getItem(key);
        if (activityData) {
          const activity = JSON.parse(activityData);
          if (activity.clientId === clientId) {
            activities.push(activity);
          }
        }
      }
    }
    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Summary and reporting
  public getClientSummary(clientId: string): ClientSummary | null {
    const client = this.getClient(clientId);
    if (!client) return null;

    const scenarios = this.getClientScenarios(clientId);
    const reminders = this.getClientReminders(clientId);
    const progress = this.getClientProgress(clientId);
    const activities = this.getClientActivities(clientId, 1);

    const pendingReminders = reminders.filter(r => r.status === 'pending');
    const overdueReminders = reminders.filter(r => 
      r.status === 'pending' && new Date(r.dueDate) < new Date()
    );

    const nextReminder = pendingReminders
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return {
      client,
      totalScenarios: scenarios.length,
      activeScenarios: scenarios.filter(s => s.status === 'active').length,
      pendingReminders: pendingReminders.length,
      overdueReminders: overdueReminders.length,
      currentStage: progress?.stage || 'initial_contact',
      lastActivity: activities[0]?.createdAt || client.createdAt,
      nextReminder
    };
  }

  // Utility methods
  private saveNote(note: ClientNote): void {
    this.storage.setItem(`note_${note.id}`, JSON.stringify(note));
  }

  private saveScenario(scenario: ClientScenario): void {
    this.storage.setItem(`scenario_${scenario.id}`, JSON.stringify(scenario));
  }

  private saveReminder(reminder: ClientReminder): void {
    this.storage.setItem(`reminder_${reminder.id}`, JSON.stringify(reminder));
  }

  private getAllReminders(): ClientReminder[] {
    const reminders: ClientReminder[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('reminder_')) {
        const reminderData = this.storage.getItem(key);
        if (reminderData) {
          reminders.push(JSON.parse(reminderData));
        }
      }
    }
    return reminders;
  }

  private removeAllClientData(clientId: string): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && (
        key.startsWith('note_') ||
        key.startsWith('scenario_') ||
        key.startsWith('reminder_') ||
        key.startsWith('progress_') ||
        key.startsWith('activity_')
      )) {
        const data = this.storage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.clientId === clientId) {
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach(key => this.storage.removeItem(key));
  }

  private saveToStorage(): void {
    this.storage.setItem('clientManagementState', JSON.stringify(this.state));
  }

  private loadFromStorage(): void {
    const stateData = this.storage.getItem('clientManagementState');
    if (stateData) {
      try {
        this.state = { ...this.state, ...JSON.parse(stateData) };
      } catch (error) {
        console.error('Failed to load client management state:', error);
      }
    }
  }

  // Event system
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

  // Additional activity management methods
  public updateActivity(activityId: string, updates: Partial<ClientActivity>): boolean {
    const activityData = this.storage.getItem(`activity_${activityId}`);
    if (!activityData) return false;

    const activity = JSON.parse(activityData);
    const updatedActivity = { ...activity, ...updates };
    
    this.storage.setItem(`activity_${activityId}`, JSON.stringify(updatedActivity));
    this.emit('activityUpdated', { activityId, updates });
    return true;
  }

  public deleteActivity(activityId: string): boolean {
    const activityData = this.storage.getItem(`activity_${activityId}`);
    if (!activityData) return false;

    this.storage.removeItem(`activity_${activityId}`);
    this.emit('activityDeleted', activityId);
    return true;
  }

  public getAllActivities(): ClientActivity[] {
    const activities: ClientActivity[] = [];
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith('activity_')) {
        const activityData = this.storage.getItem(key);
        if (activityData) {
          activities.push(JSON.parse(activityData));
        }
      }
    }

    // Sort by creation date (newest first)
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return activities;
  }

  public getActivity(activityId: string): ClientActivity | null {
    const activityData = this.storage.getItem(`activity_${activityId}`);
    return activityData ? JSON.parse(activityData) : null;
  }

  // Cleanup
  public reset(): void {
    // Clear all client-related data from storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && (
        key.startsWith('note_') ||
        key.startsWith('scenario_') ||
        key.startsWith('reminder_') ||
        key.startsWith('progress_') ||
        key.startsWith('activity_') ||
        key === 'clientManagementState'
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.storage.removeItem(key));

    this.state = {
      clients: [],
      selectedClientId: undefined,
      activeView: 'dashboard',
      filters: {},
      searchQuery: ''
    };

    this.emit('reset');
  }
}
