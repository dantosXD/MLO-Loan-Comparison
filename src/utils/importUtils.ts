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
  const requiredFields = ['loanType'];
  for (const field of requiredFields) {
    if (!(field in data.loanData)) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Ensure programs exists and is an array, or create empty array
  if (!data.loanData.programs) {
    data.loanData.programs = [];
  } else if (!Array.isArray(data.loanData.programs)) {
    return { isValid: false, error: 'Programs must be an array' };
  }
  
  // Ensure each program has required fields
  for (const program of data.loanData.programs) {
    if (!program.id || typeof program.id !== 'number') {
      return { isValid: false, error: 'Each program must have a valid id' };
    }
    if (!program.name || typeof program.name !== 'string') {
      return { isValid: false, error: 'Each program must have a valid name' };
    }
    if (typeof program.rate !== 'number') {
      return { isValid: false, error: 'Each program must have a valid rate' };
    }
    if (typeof program.term !== 'number') {
      return { isValid: false, error: 'Each program must have a valid term' };
    }
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
        loanType: data.loanData.loanType || 'purchase',
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
        programs: (data.loanData.programs || []).map((program: any) => ({
          id: program.id,
          type: program.type || 'conventional',
          rate: program.rate || 0,
          term: program.term || 30,
          selected: program.selected !== undefined ? program.selected : true,
          name: program.name || `Program ${program.id}`,
          buyDown: program.buyDown || false,
          buyDownCost: program.buyDownCost || 0,
          effectiveRate: program.effectiveRate || program.rate || 0,
          rateReduction: program.rateReduction || 0,
          overrideLoanAmount: program.overrideLoanAmount || undefined,
          previousMonthlyPITI: program.previousMonthlyPITI || undefined
        })),
        ...data.loanData // Override with existing data
      }
    };
    
    return { success: true, data: normalizedData };
  } catch (error) {
    console.error('JSON parsing error:', error);
    return { success: false, error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export const parseDebtsPaste = (pasteText: string, existingDebts: Debt[]): Debt[] => {
  const text = pasteText.trim();
  const newDebts: Debt[] = [];
  
  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(text);
    if (Array.isArray(jsonData)) {
      jsonData.forEach((item, index) => {
        if (item && typeof item === 'object') {
          const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
          const newDebt: Debt = {
            id: newId,
            creditor: item.creditor || item.Creditor || item.name || item.Name || `Debt ${newId}`,
            balance: parseFloat(item.balance || item.Balance || item.amount || item.Amount || 0),
            monthlyPayment: parseFloat(item.monthlyPayment || item.MonthlyPayment || item.payment || item.Payment || item.monthly || item.Monthly || 0),
            includeInDTI: item.includeInDTI !== undefined ? item.includeInDTI : (item.IncludeInDTI !== undefined ? item.IncludeInDTI : true),
            willBeRefinanced: item.willBeRefinanced !== undefined ? item.willBeRefinanced : (item.WillBeRefinanced !== undefined ? item.WillBeRefinanced : false)
          };
          newDebts.push(newDebt);
        }
      });
      return newDebts;
    }
  } catch (e) {
    // Not JSON, continue with other parsing methods
  }
  
  // Parse as delimited text (tab, comma, or pipe separated)
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    // Try different delimiters
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(',')) {
      parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
    } else if (line.includes('|')) {
      parts = line.split('|').map(part => part.trim());
    } else {
      // Try space separation as last resort
      parts = line.trim().split(/\s+/);
    }
    
    if (parts.length >= 3) {
      const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
      const newDebt: Debt = {
        id: newId,
        creditor: parts[0] || `Debt ${newId}`,
        balance: parseFloat(parts[1]) || 0,
        monthlyPayment: parseFloat(parts[2]) || 0,
        includeInDTI: parts[3] ? parts[3].toLowerCase() !== 'false' && parts[3].toLowerCase() !== 'no' && parts[3] !== '0' : true,
        willBeRefinanced: parts[4] ? parts[4].toLowerCase() === 'true' || parts[4].toLowerCase() === 'yes' || parts[4] === '1' : false
      };
      newDebts.push(newDebt);
    }
  });
  
  return newDebts;
};

export const parseDebtFileImport = async (file: File, existingDebts: Debt[]): Promise<{ success: boolean; debts?: Debt[]; error?: string }> => {
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'json') {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const newDebts: Debt[] = [];
      
      let dataArray: any[] = [];
      if (Array.isArray(jsonData)) {
        dataArray = jsonData;
      } else if (jsonData.debts && Array.isArray(jsonData.debts)) {
        dataArray = jsonData.debts;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        dataArray = jsonData.data;
      } else {
        return { success: false, error: 'JSON file must contain an array of debts or have a "debts" or "data" property with an array.' };
      }
      
      dataArray.forEach((item, index) => {
        if (item && typeof item === 'object') {
          const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
          const newDebt: Debt = {
            id: newId,
            creditor: item.creditor || item.Creditor || item.name || item.Name || `Debt ${newId}`,
            balance: parseFloat(item.balance || item.Balance || item.amount || item.Amount || 0),
            monthlyPayment: parseFloat(item.monthlyPayment || item.MonthlyPayment || item.payment || item.Payment || item.monthly || item.Monthly || 0),
            includeInDTI: item.includeInDTI !== undefined ? item.includeInDTI : (item.IncludeInDTI !== undefined ? item.IncludeInDTI : true),
            willBeRefinanced: item.willBeRefinanced !== undefined ? item.willBeRefinanced : (item.WillBeRefinanced !== undefined ? item.WillBeRefinanced : false)
          };
          newDebts.push(newDebt);
        }
      });
      
      return { success: true, debts: newDebts };
    } else if (fileExtension === 'csv') {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const newDebts: Debt[] = [];
      
      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('creditor') || line.toLowerCase().includes('name'))) {
          return; // Skip header if it contains expected column names
        }
        const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
        if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
          const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
          const newDebt: Debt = {
            id: newId,
            creditor: parts[0] || `Debt ${newId}`,
            balance: parseFloat(parts[1]) || 0,
            monthlyPayment: parseFloat(parts[2]) || 0,
            includeInDTI: parts[3] ? parts[3].toLowerCase() !== 'false' && parts[3].toLowerCase() !== 'no' && parts[3] !== '0' : true,
            willBeRefinanced: parts[4] ? parts[4].toLowerCase() === 'true' || parts[4].toLowerCase() === 'yes' || parts[4] === '1' : false
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
      
      // Try to get data with headers first
      let jsonData: any[] = [];
      try {
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } catch (e) {
        // Fallback to array format
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }
      
      const newDebts: Debt[] = [];
      
      jsonData.forEach((row: any, index) => {
        if (typeof row === 'object' && !Array.isArray(row)) {
          // Object format (with headers)
          const keys = Object.keys(row);
          if (keys.length >= 3) {
            const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
            const newDebt: Debt = {
              id: newId,
              creditor: row.creditor || row.Creditor || row.name || row.Name || row[keys[0]] || `Debt ${newId}`,
              balance: parseFloat(row.balance || row.Balance || row.amount || row.Amount || row[keys[1]] || 0),
              monthlyPayment: parseFloat(row.monthlyPayment || row.MonthlyPayment || row.payment || row.Payment || row.monthly || row.Monthly || row[keys[2]] || 0),
              includeInDTI: row.includeInDTI !== undefined ? row.includeInDTI : (row.IncludeInDTI !== undefined ? row.IncludeInDTI : true),
              willBeRefinanced: row.willBeRefinanced !== undefined ? row.willBeRefinanced : (row.WillBeRefinanced !== undefined ? row.WillBeRefinanced : false)
            };
            newDebts.push(newDebt);
          }
        } else if (Array.isArray(row)) {
          // Array format
          if (index > 0 && row.length >= 3 && row[0] && row[1] && row[2]) { // Skip header row
            const newId = Math.max(...existingDebts.map(d => d.id), 0) + newDebts.length + 1;
            const newDebt: Debt = {
              id: newId,
              creditor: row[0] || `Debt ${newId}`,
              balance: parseFloat(row[1]) || 0,
              monthlyPayment: parseFloat(row[2]) || 0,
              includeInDTI: row[3] ? row[3].toString().toLowerCase() !== 'false' && row[3].toString().toLowerCase() !== 'no' && row[3] !== '0' : true,
              willBeRefinanced: row[4] ? row[4].toString().toLowerCase() === 'true' || row[4].toString().toLowerCase() === 'yes' || row[4] === '1' : false
            };
            newDebts.push(newDebt);
          }
        }
      });
      
      return { success: true, debts: newDebts };
    } else {
      return { success: false, error: 'Unsupported file format. Please use JSON, CSV, or Excel files (.json, .csv, .xlsx, .xls).' };
    }
  } catch (error) {
    console.error('Debt file import error:', error);
    return { success: false, error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the file format and content.` };
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
