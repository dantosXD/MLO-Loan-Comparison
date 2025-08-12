const dbConnection = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class ScenarioService {
  constructor() {
    this.db = dbConnection;
  }

  // Get all scenarios for a user
  async getScenarios(userId = 1) {
    try {
      const scenarios = await this.db.all(
        `SELECT id, name, version, loan_data, preferred_program_id, 
                created_at, updated_at 
         FROM scenarios 
         WHERE user_id = ? AND is_deleted = 0 
         ORDER BY updated_at DESC`,
        [userId]
      );

      return scenarios.map(scenario => ({
        name: scenario.name,
        loanData: JSON.parse(scenario.loan_data),
        createdAt: scenario.created_at,
        updatedAt: scenario.updated_at,
        version: scenario.version,
        preferredProgramId: scenario.preferred_program_id
      }));
    } catch (error) {
      console.error('Error getting scenarios:', error);
      throw new Error('Failed to retrieve scenarios');
    }
  }

  // Save a new scenario or update existing
  async saveScenario(name, loanData, userId = 1, preferredProgramId = null) {
    try {
      // Check if scenario with this name already exists
      const existing = await this.db.get(
        'SELECT id FROM scenarios WHERE name = ? AND user_id = ? AND is_deleted = 0',
        [name, userId]
      );

      const loanDataJson = JSON.stringify(loanData);
      const now = new Date().toISOString();

      if (existing) {
        // Update existing scenario
        await this.db.run(
          `UPDATE scenarios 
           SET loan_data = ?, preferred_program_id = ?, updated_at = ?
           WHERE id = ?`,
          [loanDataJson, preferredProgramId, now, existing.id]
        );

        // Log audit trail
        await this.logAudit(userId, 'UPDATE', 'scenarios', existing.id, null, {
          name,
          updated_at: now
        });

        return { id: existing.id, name, updated: true };
      } else {
        // Create new scenario
        const result = await this.db.run(
          `INSERT INTO scenarios (user_id, name, version, loan_data, preferred_program_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, name, '1.0', loanDataJson, preferredProgramId, now, now]
        );

        // Log audit trail
        await this.logAudit(userId, 'CREATE', 'scenarios', result.id, null, {
          name,
          created_at: now
        });

        return { id: result.id, name, created: true };
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      throw new Error('Failed to save scenario');
    }
  }

  // Load a specific scenario
  async loadScenario(name, userId = 1) {
    try {
      const scenario = await this.db.get(
        `SELECT id, name, version, loan_data, preferred_program_id, 
                created_at, updated_at 
         FROM scenarios 
         WHERE name = ? AND user_id = ? AND is_deleted = 0`,
        [name, userId]
      );

      if (!scenario) {
        return null;
      }

      return {
        name: scenario.name,
        loanData: JSON.parse(scenario.loan_data),
        createdAt: scenario.created_at,
        updatedAt: scenario.updated_at,
        version: scenario.version,
        preferredProgramId: scenario.preferred_program_id
      };
    } catch (error) {
      console.error('Error loading scenario:', error);
      throw new Error('Failed to load scenario');
    }
  }

  // Delete a scenario (soft delete)
  async deleteScenario(name, userId = 1) {
    try {
      const scenario = await this.db.get(
        'SELECT id FROM scenarios WHERE name = ? AND user_id = ? AND is_deleted = 0',
        [name, userId]
      );

      if (!scenario) {
        throw new Error('Scenario not found');
      }

      await this.db.run(
        'UPDATE scenarios SET is_deleted = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), scenario.id]
      );

      // Log audit trail
      await this.logAudit(userId, 'DELETE', 'scenarios', scenario.id, null, {
        name,
        deleted_at: new Date().toISOString()
      });

      return { success: true, name };
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw new Error('Failed to delete scenario');
    }
  }

  // Export all scenarios
  async exportScenarios(userId = 1) {
    try {
      const scenarios = await this.getScenarios(userId);
      
      return {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        userId,
        scenarios
      };
    } catch (error) {
      console.error('Error exporting scenarios:', error);
      throw new Error('Failed to export scenarios');
    }
  }

  // Import scenarios
  async importScenarios(importData, userId = 1, overwrite = false) {
    try {
      const scenarios = importData.scenarios || [];
      let importedCount = 0;
      let errors = [];

      await this.db.beginTransaction();

      try {
        for (const scenario of scenarios) {
          if (!scenario.name || !scenario.loanData) {
            errors.push(`Invalid scenario data: ${scenario.name || 'unnamed'}`);
            continue;
          }

          try {
            const existing = await this.db.get(
              'SELECT id FROM scenarios WHERE name = ? AND user_id = ? AND is_deleted = 0',
              [scenario.name, userId]
            );

            if (existing && !overwrite) {
              errors.push(`Scenario '${scenario.name}' already exists (skipped)`);
              continue;
            }

            await this.saveScenario(
              scenario.name,
              scenario.loanData,
              userId,
              scenario.preferredProgramId
            );

            importedCount++;
          } catch (scenarioError) {
            errors.push(`Failed to import '${scenario.name}': ${scenarioError.message}`);
          }
        }

        await this.db.commit();
        
        return {
          imported: importedCount,
          errors: errors,
          total: scenarios.length
        };
      } catch (transactionError) {
        await this.db.rollback();
        throw transactionError;
      }
    } catch (error) {
      console.error('Error importing scenarios:', error);
      throw new Error('Failed to import scenarios');
    }
  }

  // Save current working state (auto-save)
  async saveCurrentState(loanData, userId = 1) {
    try {
      const name = '_current_state_';
      await this.saveScenario(name, loanData, userId);
      return { success: true };
    } catch (error) {
      console.error('Error saving current state:', error);
      throw new Error('Failed to save current state');
    }
  }

  // Load current working state
  async loadCurrentState(userId = 1) {
    try {
      const scenario = await this.loadScenario('_current_state_', userId);
      return scenario ? scenario.loanData : null;
    } catch (error) {
      console.error('Error loading current state:', error);
      return null;
    }
  }

  // Audit logging
  async logAudit(userId, action, tableName, recordId, oldValues = null, newValues = null) {
    try {
      await this.db.run(
        `INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          action,
          tableName,
          recordId,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          new Date().toISOString()
        ]
      );
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  // Get scenario statistics
  async getStatistics(userId = 1) {
    try {
      const stats = await this.db.get(
        `SELECT 
           COUNT(*) as total_scenarios,
           COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as created_today,
           COUNT(CASE WHEN DATE(updated_at) = DATE('now') THEN 1 END) as updated_today,
           MIN(created_at) as first_scenario_date,
           MAX(updated_at) as last_activity
         FROM scenarios 
         WHERE user_id = ? AND is_deleted = 0`,
        [userId]
      );

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw new Error('Failed to get statistics');
    }
  }
}

module.exports = new ScenarioService();
