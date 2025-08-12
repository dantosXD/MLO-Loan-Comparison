import * as XLSX from 'xlsx';
import { LoanData, Program } from '../types';
import { 
  calculateMonthlyPayment, 
  calculateTotalPITI, 
  formatCurrency, 
  formatPercent,
  getLoanAmount 
} from './calculations';

export const copyTableToClipboard = async (
  selectedPrograms: Program[], 
  loanData: LoanData, 
  preferredProgramId: number | null
): Promise<void> => {
  // Generate HTML table for clipboard
  let htmlTable = '<table border="1" style="border-collapse: collapse;">';
  htmlTable += '<thead><tr><th>Metric</th>';
  
  selectedPrograms.forEach(program => {
    const isPreferred = preferredProgramId === program.id;
    htmlTable += `<th style="${isPreferred ? 'background-color: #dcfce7; font-weight: bold;' : ''}">${program.name}${isPreferred ? ' (Recommended)' : ''}</th>`;
  });
  htmlTable += '</tr></thead><tbody>';
  
  // Add rows for each metric
  const metrics = [
    'Program Type',
    'Term',
    'Interest Rate',
    'Loan Amount',
    'Monthly P&I',
    'Monthly HOI',
    'Monthly Taxes',
    'Total Monthly Payment (PITI)'
  ];
  
  metrics.forEach(metric => {
    htmlTable += `<tr><td><strong>${metric}</strong></td>`;
    selectedPrograms.forEach(program => {
      const isPreferred = preferredProgramId === program.id;
      const cellStyle = isPreferred ? 'background-color: #f0fdf4;' : '';
      
      let cellValue = '';
      switch (metric) {
        case 'Program Type':
          cellValue = program.type.charAt(0).toUpperCase() + program.type.slice(1);
          break;
        case 'Term':
          cellValue = `${program.term} years`;
          break;
        case 'Interest Rate':
          if (program.buyDown && program.effectiveRate !== program.rate) {
            cellValue = `${formatPercent(program.rate)} → ${formatPercent(program.effectiveRate)}`;
          } else {
            cellValue = formatPercent(program.rate);
          }
          break;
        case 'Loan Amount':
          cellValue = formatCurrency(program.overrideLoanAmount || getLoanAmount(loanData));
          break;
        case 'Monthly P&I':
          const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
          cellValue = formatCurrency(calculateMonthlyPayment(program.overrideLoanAmount || getLoanAmount(loanData), effectiveRate, program.term));
          break;
        case 'Monthly HOI':
          cellValue = formatCurrency(loanData.annualHomeInsurance / 12);
          break;
        case 'Monthly Taxes':
          cellValue = formatCurrency(loanData.annualPropertyTax / 12);
          break;
        case 'Total Monthly Payment (PITI)':
          const totalPITI = calculateTotalPITI(program, loanData);
          cellValue = formatCurrency(totalPITI);
          break;
      }
      
      htmlTable += `<td style="${cellStyle}">${cellValue}</td>`;
    });
    htmlTable += '</tr>';
  });
  
  htmlTable += '</tbody></table>';
  
  try {
    await navigator.clipboard.writeText(htmlTable);
    alert('Table copied to clipboard as HTML!');
  } catch (err) {
    console.error('Failed to copy table: ', err);
    alert('Failed to copy table to clipboard');
  }
};

export const exportToExcel = (
  selectedPrograms: Program[], 
  loanData: LoanData, 
  preferredProgramId: number | null
): void => {
  const workbook = XLSX.utils.book_new();
  
  // Create comparison data
  const comparisonData: any[][] = [];
  
  // Header row
  const headers = ['Metric', ...selectedPrograms.map(p => p.name)];
  comparisonData.push(headers);
  
  // Data rows
  const metrics = [
    'Program Type',
    'Term',
    'Interest Rate',
    'Loan Amount',
    'Monthly P&I',
    'Monthly HOI',
    'Monthly Taxes',
    'Total Monthly Payment (PITI)'
  ];
  
  metrics.forEach(metric => {
    const row = [metric];
    selectedPrograms.forEach(program => {
      let value = '';
      switch (metric) {
        case 'Program Type':
          value = program.type.charAt(0).toUpperCase() + program.type.slice(1);
          break;
        case 'Term':
          value = `${program.term} years`;
          break;
        case 'Interest Rate':
          if (program.buyDown && program.effectiveRate !== program.rate) {
            value = `${formatPercent(program.rate)} → ${formatPercent(program.effectiveRate)}`;
          } else {
            value = formatPercent(program.rate);
          }
          break;
        case 'Loan Amount':
          value = formatCurrency(program.overrideLoanAmount || getLoanAmount(loanData));
          break;
        case 'Monthly P&I':
          const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
          value = formatCurrency(calculateMonthlyPayment(program.overrideLoanAmount || getLoanAmount(loanData), effectiveRate, program.term));
          break;
        case 'Monthly HOI':
          value = formatCurrency(loanData.annualHomeInsurance / 12);
          break;
        case 'Monthly Taxes':
          value = formatCurrency(loanData.annualPropertyTax / 12);
          break;
        case 'Total Monthly Payment (PITI)':
          value = formatCurrency(calculateTotalPITI(program, loanData));
          break;
      }
      row.push(value);
    });
    comparisonData.push(row);
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Loan Comparison');
  
  XLSX.writeFile(workbook, 'loan-comparison.xlsx');
};

export const exportToOutlookEML = (
  selectedPrograms: Program[], 
  loanData: LoanData, 
  preferredProgramId: number | null
): void => {
  const subject = 'Loan Comparison Analysis';
  
  let body = '<html><body>';
  body += '<h2>Loan Comparison Analysis</h2>';
  body += '<table border="1" style="border-collapse: collapse; width: 100%;">';
  body += '<thead><tr style="background-color: #f5f5f5;"><th style="padding: 8px;">Metric</th>';
  
  selectedPrograms.forEach(program => {
    const isPreferred = preferredProgramId === program.id;
    body += `<th style="padding: 8px; ${isPreferred ? 'background-color: #dcfce7; font-weight: bold;' : ''}">${program.name}${isPreferred ? ' (Recommended)' : ''}</th>`;
  });
  body += '</tr></thead><tbody>';
  
  // Add comparison rows (similar to copyTableToClipboard logic)
  const metrics = [
    'Program Type',
    'Term', 
    'Interest Rate',
    'Loan Amount',
    'Monthly P&I',
    'Monthly HOI',
    'Monthly Taxes',
    'Total Monthly Payment (PITI)'
  ];
  
  metrics.forEach(metric => {
    body += `<tr><td style="padding: 8px; font-weight: bold;">${metric}</td>`;
    selectedPrograms.forEach(program => {
      const isPreferred = preferredProgramId === program.id;
      const cellStyle = `padding: 8px; ${isPreferred ? 'background-color: #f0fdf4;' : ''}`;
      
      let cellValue = '';
      switch (metric) {
        case 'Program Type':
          cellValue = program.type.charAt(0).toUpperCase() + program.type.slice(1);
          break;
        case 'Term':
          cellValue = `${program.term} years`;
          break;
        case 'Interest Rate':
          if (program.buyDown && program.effectiveRate !== program.rate) {
            cellValue = `${formatPercent(program.rate)} → ${formatPercent(program.effectiveRate)}`;
          } else {
            cellValue = formatPercent(program.rate);
          }
          break;
        case 'Loan Amount':
          cellValue = formatCurrency(program.overrideLoanAmount || getLoanAmount(loanData));
          break;
        case 'Monthly P&I':
          const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
          cellValue = formatCurrency(calculateMonthlyPayment(program.overrideLoanAmount || getLoanAmount(loanData), effectiveRate, program.term));
          break;
        case 'Monthly HOI':
          cellValue = formatCurrency(loanData.annualHomeInsurance / 12);
          break;
        case 'Monthly Taxes':
          cellValue = formatCurrency(loanData.annualPropertyTax / 12);
          break;
        case 'Total Monthly Payment (PITI)':
          cellValue = formatCurrency(calculateTotalPITI(program, loanData));
          break;
      }
      
      body += `<td style="${cellStyle}">${cellValue}</td>`;
    });
    body += '</tr>';
  });
  
  body += '</tbody></table>';
  body += '<br><p><em>Rates are not final and are subject to change pending final underwriting approval.</em></p>';
  body += '</body></html>';
  
  const emlContent = [
    'Subject: ' + subject,
    'Content-Type: text/html; charset=UTF-8',
    '',
    body
  ].join('\r\n');
  
  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'loan-comparison.eml';
  a.click();
  URL.revokeObjectURL(url);
};

export const exportScenarioToJson = (loanData: LoanData, preferredProgramId: number | null): void => {
  const exportData = {
    version: '1',
    exportedAt: new Date().toISOString(),
    loanData,
    preferredProgramId
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'loan-comparison.json';
  a.click();
  URL.revokeObjectURL(url);
};
