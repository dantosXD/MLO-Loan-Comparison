import { LoanData } from '../types';

export interface ScenarioData {
  name: string;
  loanData: LoanData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Storage abstraction layer for loan comparison scenarios
 * Currently uses localStorage, but can be easily switched to API calls
 * without changing any component code.
 */
class StorageManager {
  private readonly SCENARIOS_KEY = 'loan_scenarios';
  private readonly CURRENT_SCENARIO_KEY = 'current_scenario';

  /**
   * Get all saved scenarios
   */
  async getScenarios(): Promise<ScenarioData[]> {
    try {
      const data = localStorage.getItem(this.SCENARIOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading scenarios:', error);
      return [];
    }
  }

  /**
   * Save a new scenario or update existing one
   */
  async saveScenario(name: string, loanData: LoanData): Promise<void> {
    try {
      const scenarios = await this.getScenarios();
      const existingIndex = scenarios.findIndex(s => s.name === name);
      
      const scenarioData: ScenarioData = {
        name,
        loanData,
        createdAt: existingIndex >= 0 ? scenarios[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        scenarios[existingIndex] = scenarioData;
      } else {
        scenarios.push(scenarioData);
      }

      localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(scenarios));
    } catch (error) {
      console.error('Error saving scenario:', error);
      throw new Error('Failed to save scenario');
    }
  }

  /**
   * Load a specific scenario by name
   */
  async loadScenario(name: string): Promise<ScenarioData | null> {
    try {
      const scenarios = await this.getScenarios();
      return scenarios.find(s => s.name === name) || null;
    } catch (error) {
      console.error('Error loading scenario:', error);
      return null;
    }
  }

  /**
   * Delete a scenario by name
   */
  async deleteScenario(name: string): Promise<void> {
    try {
      const scenarios = await this.getScenarios();
      const filteredScenarios = scenarios.filter(s => s.name !== name);
      localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(filteredScenarios));
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw new Error('Failed to delete scenario');
    }
  }

  /**
   * Save current working state (auto-save functionality)
   */
  async saveCurrentState(loanData: LoanData): Promise<void> {
    try {
      localStorage.setItem(this.CURRENT_SCENARIO_KEY, JSON.stringify({
        loanData,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving current state:', error);
    }
  }

  /**
   * Load current working state (auto-restore functionality)
   */
  async loadCurrentState(): Promise<LoanData | null> {
    try {
      const data = localStorage.getItem(this.CURRENT_SCENARIO_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.loanData;
      }
      return null;
    } catch (error) {
      console.error('Error loading current state:', error);
      return null;
    }
  }

  /**
   * Export all scenarios as JSON
   */
  async exportAllScenarios(): Promise<string> {
    const scenarios = await this.getScenarios();
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      scenarios
    }, null, 2);
  }

  /**
   * Import scenarios from JSON
   */
  async importScenarios(jsonData: string, overwrite: boolean = false): Promise<number> {
    try {
      const importData = JSON.parse(jsonData);
      const importedScenarios = importData.scenarios || [];
      
      if (!Array.isArray(importedScenarios)) {
        throw new Error('Invalid import format');
      }

      let existingScenarios = overwrite ? [] : await this.getScenarios();
      let importedCount = 0;

      for (const scenario of importedScenarios) {
        if (scenario.name && scenario.loanData) {
          const existingIndex = existingScenarios.findIndex(s => s.name === scenario.name);
          
          if (existingIndex >= 0) {
            if (overwrite) {
              existingScenarios[existingIndex] = scenario;
              importedCount++;
            }
          } else {
            existingScenarios.push(scenario);
            importedCount++;
          }
        }
      }

      localStorage.setItem(this.SCENARIOS_KEY, JSON.stringify(existingScenarios));
      return importedCount;
    } catch (error) {
      console.error('Error importing scenarios:', error);
      throw new Error('Failed to import scenarios');
    }
  }

  // Future: When ready for database backend, just replace these methods
  // with API calls. The interface stays the same!
  
  /*
  async saveScenario(name: string, loanData: LoanData): Promise<void> {
    const response = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, loanData })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save scenario');
    }
  }
  */
}

// Export singleton instance
export const storageManager = new StorageManager();
export default storageManager;
