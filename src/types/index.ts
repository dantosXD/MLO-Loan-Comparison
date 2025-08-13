export interface Program {
  id: number;
  type: 'conventional' | 'fha' | 'va' | 'usda';
  rate: number;
  term: number;
  selected: boolean;
  name: string;
  buyDown: boolean;
  buyDownCost: number;
  effectiveRate: number;
  rateReduction?: number;
  overrideLoanAmount?: number;
  previousMonthlyPITI?: number;
}

export interface Debt {
  id: number;
  creditor: string;
  balance: number;
  monthlyPayment: number;
  includeInDTI: boolean;
  willBeRefinanced: boolean;
}

export interface ProgramDebtSelection {
  programId: number;
  selectedDebtIds: number[];
  totalMonthlyDebt: number;
  lastUpdated: string;
}

export interface LoanData {
  loanType: 'purchase' | 'refinance';
  purchasePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  refinanceAmount: number;
  refinanceLoanAmount: number;
  hoi: number;
  propertyTaxes: number;
  annualPropertyTax: number;
  annualHomeInsurance: number;
  grossMonthlyIncome: number;
  programs: Program[];
  debts: Debt[];
  programDebtSelections: ProgramDebtSelection[];
}

export interface SavedScenario {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  loanData: LoanData;
  preferredProgramId?: number | null;
}

// Re-export debt management types
export * from './debt';

// Re-export calculation types
export type { DTIResult } from '../utils/calculations';
