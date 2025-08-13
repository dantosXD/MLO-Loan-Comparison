/**
 * Enhanced debt management types for extensible debt handling
 */

export interface DebtItem {
  id: string;
  name: string;
  creditor: string;
  balance: number;
  monthlyPayment: number;
  interestRate?: number;
  minimumPayment?: number;
  includeInDTI: boolean;
  willBeRefinanced: boolean;
  category: 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan' | 'other';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramDebtSelection {
  programId: number;
  selectedDebtIds: string[];
  quickTotalOverride?: number; // Override with quick total if provided
  useQuickTotal: boolean; // Whether to use quick total instead of detailed debts
}

export interface DebtManagementState {
  // Quick debt input
  quickTotalMonthlyDebt: number;
  useQuickTotal: boolean;
  
  // Detailed debt tracking
  debts: DebtItem[];
  
  // Per-program debt selections
  programDebtSelections: ProgramDebtSelection[];
  
  // UI state
  showDetailedDebts: boolean;
  activeModal?: {
    type: 'debt-selection';
    programId: number;
  } | null;
}

export interface DebtCalculationResult {
  totalMonthlyDebt: number;
  totalBalance: number;
  debtsByCategory: Record<string, {
    count: number;
    monthlyPayment: number;
    balance: number;
  }>;
  selectedDebts: DebtItem[];
}

export interface DebtManagementConfig {
  allowQuickTotal: boolean;
  allowDetailedDebts: boolean;
  allowPerProgramSelection: boolean;
  defaultCategories: string[];
  autoCalculateDTI: boolean;
}
