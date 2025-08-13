/**
 * Debt Management Plugin - Extensible debt handling for financial tools
 * This plugin can be used across different financial tools that need debt management
 */

import { DebtItem, DebtManagementState, ProgramDebtSelection, DebtCalculationResult, DebtManagementConfig } from '../../types/debt';

export class DebtManagementPlugin {
  private state: DebtManagementState;
  private config: DebtManagementConfig;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<DebtManagementConfig> = {}) {
    this.config = {
      allowQuickTotal: true,
      allowDetailedDebts: true,
      allowPerProgramSelection: true,
      defaultCategories: ['credit_card', 'auto_loan', 'student_loan', 'personal_loan', 'other'],
      autoCalculateDTI: true,
      ...config
    };

    this.state = {
      quickTotalMonthlyDebt: 0,
      useQuickTotal: true,
      debts: [],
      programDebtSelections: [],
      showDetailedDebts: false,
      activeModal: null
    };
  }

  // State management
  public getState(): DebtManagementState {
    return { ...this.state };
  }

  public setState(updates: Partial<DebtManagementState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChanged', this.state);
  }

  public getConfig(): DebtManagementConfig {
    return { ...this.config };
  }

  // Debt operations
  public addDebt(debtData: Omit<DebtItem, 'id' | 'createdAt' | 'updatedAt'>): DebtItem {
    const newDebt: DebtItem = {
      ...debtData,
      id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.setState({
      debts: [...this.state.debts, newDebt]
    });

    this.emit('debtAdded', newDebt);
    return newDebt;
  }

  public updateDebt(debtId: string, updates: Partial<DebtItem>): boolean {
    const debtIndex = this.state.debts.findIndex(debt => debt.id === debtId);
    if (debtIndex === -1) return false;

    const updatedDebts = [...this.state.debts];
    updatedDebts[debtIndex] = {
      ...updatedDebts[debtIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.setState({ debts: updatedDebts });
    this.emit('debtUpdated', { debtId, updates });
    return true;
  }

  public removeDebt(debtId: string): boolean {
    const debtExists = this.state.debts.some(debt => debt.id === debtId);
    if (!debtExists) return false;

    // Remove debt from debts array
    const updatedDebts = this.state.debts.filter(debt => debt.id !== debtId);
    
    // Remove debt from all program selections
    const updatedSelections = this.state.programDebtSelections.map(selection => ({
      ...selection,
      selectedDebtIds: selection.selectedDebtIds.filter(id => id !== debtId)
    }));

    this.setState({
      debts: updatedDebts,
      programDebtSelections: updatedSelections
    });

    this.emit('debtRemoved', debtId);
    return true;
  }

  public getDebt(debtId: string): DebtItem | null {
    return this.state.debts.find(debt => debt.id === debtId) || null;
  }

  public getAllDebts(): DebtItem[] {
    return [...this.state.debts];
  }

  public getDebtsByCategory(category: string): DebtItem[] {
    return this.state.debts.filter(debt => debt.category === category);
  }

  // Program debt selection operations
  public setProgramDebtSelection(programId: number, selection: Partial<ProgramDebtSelection>): void {
    const existingIndex = this.state.programDebtSelections.findIndex(s => s.programId === programId);
    let updatedSelections;

    if (existingIndex >= 0) {
      updatedSelections = [...this.state.programDebtSelections];
      updatedSelections[existingIndex] = {
        ...updatedSelections[existingIndex],
        ...selection
      };
    } else {
      const newSelection: ProgramDebtSelection = {
        programId,
        selectedDebtIds: [],
        useQuickTotal: true,
        ...selection
      };
      updatedSelections = [...this.state.programDebtSelections, newSelection];
    }

    this.setState({ programDebtSelections: updatedSelections });
    this.emit('programSelectionChanged', { programId, selection });
  }

  public getProgramDebtSelection(programId: number): ProgramDebtSelection | null {
    return this.state.programDebtSelections.find(s => s.programId === programId) || null;
  }

  // Debt calculations
  public calculateDebtForProgram(programId: number): DebtCalculationResult {
    const selection = this.getProgramDebtSelection(programId);
    
    // Use quick total if no selection exists or if quick total is enabled
    if (!selection || selection.useQuickTotal) {
      const totalMonthlyDebt = selection?.quickTotalOverride ?? this.state.quickTotalMonthlyDebt;
      return {
        totalMonthlyDebt,
        totalBalance: 0, // Unknown for quick total
        debtsByCategory: {},
        selectedDebts: []
      };
    }

    // Calculate from selected debts
    const selectedDebts = this.state.debts.filter(debt => 
      selection.selectedDebtIds.includes(debt.id) && debt.includeInDTI
    );

    const totalMonthlyDebt = selectedDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
    const totalBalance = selectedDebts.reduce((sum, debt) => sum + debt.balance, 0);

    const debtsByCategory = selectedDebts.reduce((acc, debt) => {
      if (!acc[debt.category]) {
        acc[debt.category] = { count: 0, monthlyPayment: 0, balance: 0 };
      }
      acc[debt.category].count++;
      acc[debt.category].monthlyPayment += debt.monthlyPayment;
      acc[debt.category].balance += debt.balance;
      return acc;
    }, {} as Record<string, { count: number; monthlyPayment: number; balance: number }>);

    return {
      totalMonthlyDebt,
      totalBalance,
      debtsByCategory,
      selectedDebts
    };
  }

  public calculateTotalDebt(): DebtCalculationResult {
    const allDebts = this.state.debts.filter(debt => debt.includeInDTI);
    
    const totalMonthlyDebt = allDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
    const totalBalance = allDebts.reduce((sum, debt) => sum + debt.balance, 0);

    const debtsByCategory = allDebts.reduce((acc, debt) => {
      if (!acc[debt.category]) {
        acc[debt.category] = { count: 0, monthlyPayment: 0, balance: 0 };
      }
      acc[debt.category].count++;
      acc[debt.category].monthlyPayment += debt.monthlyPayment;
      acc[debt.category].balance += debt.balance;
      return acc;
    }, {} as Record<string, { count: number; monthlyPayment: number; balance: number }>);

    return {
      totalMonthlyDebt,
      totalBalance,
      debtsByCategory,
      selectedDebts: allDebts
    };
  }

  // Import/Export functionality
  public exportDebts(): any {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      state: this.state,
      config: this.config
    };
  }

  public importDebts(data: any): boolean {
    try {
      if (data.version && data.state) {
        this.setState(data.state);
        this.emit('debtsImported', data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import debts:', error);
      return false;
    }
  }

  // Validation
  public validateDebt(debtData: Partial<DebtItem>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!debtData.name || debtData.name.trim().length === 0) {
      errors.push('Debt name is required');
    }

    if (!debtData.creditor || debtData.creditor.trim().length === 0) {
      errors.push('Creditor name is required');
    }

    if (debtData.balance !== undefined && debtData.balance < 0) {
      errors.push('Balance cannot be negative');
    }

    if (debtData.monthlyPayment !== undefined && debtData.monthlyPayment < 0) {
      errors.push('Monthly payment cannot be negative');
    }

    if (debtData.interestRate !== undefined && (debtData.interestRate < 0 || debtData.interestRate > 100)) {
      errors.push('Interest rate must be between 0 and 100 percent');
    }

    if (debtData.category && !this.config.defaultCategories.includes(debtData.category)) {
      errors.push(`Invalid category. Must be one of: ${this.config.defaultCategories.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
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
          console.error(`Error in debt management event callback for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  public getDebtSummary(): {
    totalDebts: number;
    totalMonthlyPayment: number;
    totalBalance: number;
    averageInterestRate: number;
    debtsByCategory: Record<string, number>;
  } {
    const debts = this.state.debts.filter(debt => debt.includeInDTI);
    
    const totalMonthlyPayment = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
    const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
    
    const debtsWithRates = debts.filter(debt => debt.interestRate !== undefined);
    const averageInterestRate = debtsWithRates.length > 0 
      ? debtsWithRates.reduce((sum, debt) => sum + (debt.interestRate || 0), 0) / debtsWithRates.length
      : 0;

    const debtsByCategory = debts.reduce((acc, debt) => {
      acc[debt.category] = (acc[debt.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDebts: debts.length,
      totalMonthlyPayment,
      totalBalance,
      averageInterestRate,
      debtsByCategory
    };
  }

  // Reset functionality
  public reset(): void {
    this.state = {
      quickTotalMonthlyDebt: 0,
      useQuickTotal: true,
      debts: [],
      programDebtSelections: [],
      showDetailedDebts: false,
      activeModal: null
    };
    this.emit('reset');
  }
}
