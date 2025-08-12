import * as XLSX from 'xlsx';
import { LoanData, Debt } from '../types';

export const validateJsonImport = (data: any): { isValid: boolean; error?: string } => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid JSON format' };
  }
  
  if (!data.loanData || typeof data.loanData !== 'object') {
    return { isValid: false, error: 'Missing or invalid loanData' };
  }
  
  // Check for required fields - loanType and programs are essential
  const requiredFields = ['loanType', 'programs'];
  for (const field of requiredFields) {
    if (!(field in data.loanData)) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }
  
  if (!Array.isArray(data.loanData.programs)) {
    return { isValid: false, error: 'Programs must be an array' };
  }
  
  // Make debts optional for backward compatibility
  if (data.loanData.debts && !Array.isArray(data.loanData.debts)) {
    return { isValid: false, error: 'Debts must be an array if provided' };
  }
  
  return { isValid: true };
};

export const parseJsonImport = (jsonString: string): { success: boolean; data?: any; error?: string } => {
  try {
    const data = JSON.parse(jsonString);
    const validation = validateJsonImport(data);
    
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    
    // Ensure backward compatibility by providing default values for missing fields
    const normalizedData = {
      ...data,
      loanData: {
        // Provide defaults for missing fields
        purchasePrice: data.loanData.purchasePrice || 0,
        downPayment: data.loanData.downPayment || 0,
        downPaymentPercent: data.loanData.downPaymentPercent || 20,
        refinanceAmount: data.loanData.refinanceAmount || 0,
        refinanceLoanAmount: data.loanData.refinanceLoanAmount || 0,
        hoi: data.loanData.hoi || 0,
        propertyTaxes: data.loanData.propertyTaxes || 0,
        annualPropertyTax: data.loanData.annualPropertyTax || data.loanData.propertyTaxes || 0,
        annualHomeInsurance: data.loanData.annualHomeInsurance || data.loanData.hoi || 0,
        grossMonthlyIncome: data.loanData.grossMonthlyIncome || 0,
        debts: data.loanData.debts || [], // Default to empty array if not provided
        ...data.loanData // Override with existing data
      }
    };
    
    return { success: true, data: normalizedData };
  } catch (error) {
    return { success: false, error: 'Invalid JSON format' };
  }
};

export const parseDebtsPaste = (pasteText: string, existingDebts: Debt[]): Debt[] => {
  const lines = pasteText.trim().split('\n');
  const newDebts: Debt[] = [];
  
  lines.forEach((line, index) => {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
      const newDebt: Debt = {
        id: newId,
        creditor: parts[0] || '',
        balance: parseFloat(parts[1]) || 0,
        monthlyPayment: parseFloat(parts[2]) || 0,
        includeInDTI: true,
        willBeRefinanced: false
      };
      newDebts.push(newDebt);
    }
  });
  
  return newDebts;
};

export const parseDebtFileImport = async (file: File, existingDebts: Debt[]): Promise<{ success: boolean; debts?: Debt[]; error?: string }> => {
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const newDebts: Debt[] = [];
      
      lines.forEach((line, index) => {
        if (index === 0) return; // Skip header
        const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
        if (parts.length >= 3) {
          const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
          const newDebt: Debt = {
            id: newId,
            creditor: parts[0] || '',
            balance: parseFloat(parts[1]) || 0,
            monthlyPayment: parseFloat(parts[2]) || 0,
            includeInDTI: true,
            willBeRefinanced: false
          };
          newDebts.push(newDebt);
        }
      });
      
      return { success: true, debts: newDebts };
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const newDebts: Debt[] = [];
      
      jsonData.forEach((row: any, index) => {
        if (index > 0 && row.length >= 3) { // Skip header row
          const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
          const newDebt: Debt = {
            id: newId,
            creditor: row[0] || '',
            balance: parseFloat(row[1]) || 0,
            monthlyPayment: parseFloat(row[2]) || 0,
            includeInDTI: true,
            willBeRefinanced: false
          };
          newDebts.push(newDebt);
        }
      });
      
      return { success: true, debts: newDebts };
    } else {
      return { success: false, error: 'Unsupported file format. Please use CSV or Excel files.' };
    }
  } catch (error) {
    return { success: false, error: 'Failed to parse file. Please check the format.' };
  }
};

export const parseJsonFileImport = async (file: File): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const text = await file.text();
    return parseJsonImport(text);
  } catch (error) {
    return { success: false, error: 'Failed to read file' };
  }
};
