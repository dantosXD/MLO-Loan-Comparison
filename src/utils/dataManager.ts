/**
 * Unified Data Manager - Handles both session-based and client-tied data persistence
 * 
 * Strategy:
 * - Session data: Stored in localStorage with session keys
 * - Client data: Stored with client records and synced to localStorage
 * - Automatic fallback and migration between session -> client data
 */

export interface SessionData {
  sessionId: string;
  createdAt: string;
  lastAccessed: string;
  [key: string]: any; // Allow dynamic properties
}

export interface ClientSessionData {
  sessionId: string;
  clientId: string;
  createdAt: string;
  lastAccessed: string;
  [key: string]: any; // Allow dynamic properties
}

export interface AnonymousUserData {
  sessionId: string;
  createdAt: string;
  lastAccessed: string;
  [key: string]: any; // Allow dynamic properties
}

export class UnifiedDataManager {
  private sessionId: string;
  private currentClientId: string | null = null;
  private anonymousStoragePrefix = 'loan_tool_anonymous_';
  private clientSessionStoragePrefix = 'loan_tool_client_session_';

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.cleanupOldSessions();
  }

  // Session Management
  private getOrCreateSessionId(): string {
    const stored = localStorage.getItem('loan_tool_session_id');
    if (stored) {
      return stored;
    }
    
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('loan_tool_session_id', newSessionId);
    return newSessionId;
  }

  private cleanupOldSessions(): void {
    // Clean up sessions older than 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('loan_tool_anonymous_') || key.startsWith('loan_tool_client_session_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.lastAccessed && new Date(data.lastAccessed) < cutoffDate) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove corrupted session data
          localStorage.removeItem(key);
        }
      }
    });
  }

  // Client Context Management
  public setCurrentClient(clientId: string | null): void {
    this.currentClientId = clientId;
    
    // If switching to a client, migrate anonymous data if needed
    if (clientId && this.hasAnonymousData()) {
      this.offerDataMigration(clientId);
    }
  }

  public getCurrentClient(): string | null {
    return this.currentClientId;
  }

  // Data Storage Methods
  public saveData(dataType: string, data: any): void {
    if (this.currentClientId) {
      this.saveClientSessionData(this.currentClientId, dataType, data);
    } else {
      this.saveAnonymousData(dataType, data);
    }
  }

  public loadData(dataType: string): any {
    if (this.currentClientId) {
      return this.loadClientSessionData(this.currentClientId, dataType);
    } else {
      return this.loadAnonymousData(dataType);
    }
  }

  // Anonymous User Data Methods
  private saveAnonymousData(dataType: string, data: any): void {
    const anonymousData = this.getAnonymousData();
    anonymousData[dataType] = data;
    anonymousData.lastAccessed = new Date().toISOString();
    
    const storageKey = `${this.anonymousStoragePrefix}${this.sessionId}`;
    localStorage.setItem(storageKey, JSON.stringify(anonymousData));
  }

  private loadAnonymousData(dataType: string): any {
    const anonymousData = this.getAnonymousData();
    return anonymousData[dataType] || null;
  }

  private getAnonymousData(): AnonymousUserData {
    const storageKey = `${this.anonymousStoragePrefix}${this.sessionId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        data.lastAccessed = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn('Corrupted anonymous data, creating new session');
      }
    }

    // Create new anonymous user data
    const newAnonymousData: AnonymousUserData = {
      sessionId: this.sessionId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(newAnonymousData));
    return newAnonymousData;
  }

  private hasAnonymousData(): boolean {
    const anonymousData = this.getAnonymousData();
    return !!(anonymousData.loanData || anonymousData.debts?.length || anonymousData.activities?.length);
  }

  // Client Session Data Methods (session + client combination)
  private saveClientSessionData(clientId: string, dataType: string, data: any): void {
    const clientSessionData = this.getClientSessionData(clientId);
    clientSessionData[dataType] = data;
    clientSessionData.lastAccessed = new Date().toISOString();
    
    const storageKey = `${this.clientSessionStoragePrefix}${this.sessionId}_${clientId}`;
    localStorage.setItem(storageKey, JSON.stringify(clientSessionData));
  }

  private loadClientSessionData(clientId: string, dataType: string): any {
    const clientSessionData = this.getClientSessionData(clientId);
    return clientSessionData[dataType] || null;
  }

  private getClientSessionData(clientId: string): ClientSessionData {
    const storageKey = `${this.clientSessionStoragePrefix}${this.sessionId}_${clientId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        data.lastAccessed = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(data));
        return data;
      } catch (error) {
        console.warn(`Corrupted client session data for ${clientId}, creating new`);
      }
    }

    // Create new client session data
    const newClientSessionData: ClientSessionData = {
      sessionId: this.sessionId,
      clientId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(newClientSessionData));
    return newClientSessionData;
  }

  // Data Migration
  private offerDataMigration(clientId: string): void {
    const anonymousData = this.getAnonymousData();
    const hasData = anonymousData.loanData || anonymousData.debts?.length || anonymousData.activities?.length;
    
    if (!hasData) return;

    // In a real app, you'd show a modal here. For now, we'll auto-migrate
    console.log(`Migrating anonymous data to client session ${this.sessionId}_${clientId}`);
    
    // Migrate all data from anonymous to client session
    Object.keys(anonymousData).forEach(key => {
      if (key !== 'sessionId' && key !== 'createdAt' && key !== 'lastAccessed') {
        this.saveClientSessionData(clientId, key, anonymousData[key]);
      }
    });

    // Clear anonymous data after migration
    this.clearAnonymousData();
  }

  public migrateAnonymousToClient(clientId: string): boolean {
    try {
      this.offerDataMigration(clientId);
      return true;
    } catch (error) {
      console.error('Failed to migrate anonymous data:', error);
      return false;
    }
  }

  // Utility Methods
  public clearAnonymousData(): void {
    const storageKey = `${this.anonymousStoragePrefix}${this.sessionId}`;
    localStorage.removeItem(storageKey);
  }

  public clearClientSessionData(clientId: string): void {
    const storageKey = `${this.clientSessionStoragePrefix}${this.sessionId}_${clientId}`;
    localStorage.removeItem(storageKey);
  }

  public exportAnonymousData(): AnonymousUserData | null {
    return this.hasAnonymousData() ? this.getAnonymousData() : null;
  }

  public exportClientSessionData(clientId: string): ClientSessionData | null {
    try {
      return this.getClientSessionData(clientId);
    } catch (error) {
      return null;
    }
  }

  // Specific Data Type Helpers
  public saveLoanData(loanData: any): void {
    this.saveData('loanData', loanData);
  }

  public loadLoanData(): any {
    return this.loadData('loanData');
  }

  public saveDebts(debts: any[]): void {
    this.saveData('debts', debts);
  }

  public loadDebts(): any[] {
    return this.loadData('debts') || [];
  }

  public saveActivities(activities: any[]): void {
    this.saveData('activities', activities);
  }

  public loadActivities(): any[] {
    return this.loadData('activities') || [];
  }

  public saveScenarios(scenarios: any[]): void {
    this.saveData('scenarios', scenarios);
  }

  public loadScenarios(): any[] {
    return this.loadData('scenarios') || [];
  }

  public saveProgramDebtSelections(selections: any[]): void {
    this.saveData('programDebtSelections', selections);
  }

  public loadProgramDebtSelections(): any[] {
    return this.loadData('programDebtSelections') || [];
  }

  // Analytics/Debugging
  public getDataSummary(): {
    sessionId: string;
    currentClientId: string | null;
    anonymousDataSize: number;
    clientSessionDataSize: number;
    totalStorageUsed: number;
    storageKeys: string[];
  } {
    const anonymousData = this.getAnonymousData();
    const clientSessionData = this.currentClientId ? this.getClientSessionData(this.currentClientId) : null;
    
    const anonymousSize = JSON.stringify(anonymousData).length;
    const clientSessionSize = clientSessionData ? JSON.stringify(clientSessionData).length : 0;
    
    // Get all storage keys for this session
    const storageKeys = Object.keys(localStorage).filter(key => 
      key.includes(this.sessionId)
    );
    
    return {
      sessionId: this.sessionId,
      currentClientId: this.currentClientId,
      anonymousDataSize: anonymousSize,
      clientSessionDataSize: clientSessionSize,
      totalStorageUsed: anonymousSize + clientSessionSize,
      storageKeys
    };
  }

  // Get all anonymous users (for admin/debugging)
  public getAllAnonymousUsers(): AnonymousUserData[] {
    const anonymousUsers: AnonymousUserData[] = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.anonymousStoragePrefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          anonymousUsers.push(data);
        } catch (error) {
          console.warn(`Corrupted anonymous data in key: ${key}`);
        }
      }
    });
    
    return anonymousUsers.sort((a, b) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    );
  }

  // Get all client sessions for current session ID
  public getCurrentSessionClientData(): ClientSessionData[] {
    const clientSessions: ClientSessionData[] = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`${this.clientSessionStoragePrefix}${this.sessionId}_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          clientSessions.push(data);
        } catch (error) {
          console.warn(`Corrupted client session data in key: ${key}`);
        }
      }
    });
    
    return clientSessions.sort((a, b) => 
      new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
    );
  }
}

// Singleton instance
export const dataManager = new UnifiedDataManager();
