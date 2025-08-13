import { Program, Debt, LoanData } from '../types';

export const calculateMonthlyPayment = (principal: number, annualRate: number, termYears: number): number => {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return monthlyPayment;
};

export const getLoanAmount = (loanData: LoanData): number => {
  if (loanData.loanType === 'purchase') {
    return loanData.purchasePrice - loanData.downPayment;
  } else {
    return loanData.refinanceLoanAmount || loanData.refinanceAmount;
  }
};

export const calculateTotalPITI = (program: Program, loanData: LoanData): number => {
  const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
  const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
  const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
  const monthlyTaxes = loanData.annualPropertyTax / 12;
  const monthlyInsurance = loanData.annualHomeInsurance / 12;
  
  return monthlyPI + monthlyTaxes + monthlyInsurance;
};

export interface DTIResult {
  totalDTI: number;
  housingDTI: number;
  totalMonthlyObligations: number;
  housingPayment: number;
  debtPayments: number;
}

export const calculateDTIForProgram = (loanData: LoanData, program: Program): DTIResult => {
  if (loanData.grossMonthlyIncome <= 0) {
    return {
      totalDTI: 0,
      housingDTI: 0,
      totalMonthlyObligations: 0,
      housingPayment: 0,
      debtPayments: 0
    };
  }
  
  const housingPayment = calculateTotalPITI(program, loanData);
  const debtPayments = totalSelectedMonthlyDebts(loanData.debts);
  const totalMonthlyObligations = housingPayment + debtPayments;
  
  const housingDTI = (housingPayment / loanData.grossMonthlyIncome) * 100;
  const totalDTI = (totalMonthlyObligations / loanData.grossMonthlyIncome) * 100;
  
  return {
    totalDTI,
    housingDTI,
    totalMonthlyObligations,
    housingPayment,
    debtPayments
  };
};

export const totalSelectedMonthlyDebts = (debts: Debt[]): number => {
  return debts
    .filter(debt => debt.includeInDTI)
    .reduce((total, debt) => total + debt.monthlyPayment, 0);
};

export const totalRefinancedDebts = (debts: Debt[]): number => {
  return debts
    .filter(debt => debt.willBeRefinanced)
    .reduce((total, debt) => total + debt.balance, 0);
};

export const totalRefinancedMonthlyPayments = (debts: Debt[]): number => {
  return debts
    .filter(debt => debt.willBeRefinanced)
    .reduce((total, debt) => total + debt.monthlyPayment, 0);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercent = (rate: number): string => {
  return `${rate.toFixed(3)}%`;
};
