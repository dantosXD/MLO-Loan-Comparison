import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface Program {
  id: number;
  type: string;
  rate: number;
  term: number;
  selected: boolean;
  name: string;
  buyDown: boolean;
  buyDownCost: number;
  effectiveRate: number;
  rateReduction?: number;
  // Optional program-specific overrides for refinance comparisons
  overrideLoanAmount?: number; // if set, use this amount for PI/MI calculations
  previousMonthlyPITI?: number; // to show savings vs current situation
}

interface LoanData {
  loanType: 'purchase' | 'refinance';
  purchasePrice: number;
  downPayment: number;
  refinanceLoanAmount: number;
  currentPropertyValue: number;
  hoi: number;
  propertyTaxes: number;
  programs: Program[];
}

// Scenario persistence/export types
interface ScenarioPayloadV1 {
  version: 1;
  name?: string;
  loanData: LoanData;
  preferredProgramId: number | null;
}

interface SavedScenario {
  id: string;
  name: string;
  payload: ScenarioPayloadV1;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

const SCENARIOS_KEY = 'lct_scenarios_v1';

const LoanComparisonTool = () => {
  // Initial state with one default program
  const [loanData, setLoanData] = useState<LoanData>({
    loanType: 'purchase',
    purchasePrice: 400000,
    downPayment: 80000,
    refinanceLoanAmount: 320000,
    currentPropertyValue: 400000,
    hoi: 1500,
    propertyTaxes: 5000,
    programs: [
      {
        id: Date.now(),
        type: 'conventional',
        rate: 7.000,
        term: 30,
        selected: true,
        name: 'Conventional Fixed 30yr',
        buyDown: false,
        buyDownCost: 0,
        effectiveRate: 7.000
      }
    ]
  });

  // Preferred recommendation (one program)
  const [preferredProgramId, setPreferredProgramId] = useState<number | null>(
    (loanData.programs && loanData.programs.length > 0) ? loanData.programs[0].id : null
  );

  // Scenario state
  const [scenarioName, setScenarioName] = useState<string>('');
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');

  // Load saved scenarios on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENARIOS_KEY);
      if (raw) setSavedScenarios(JSON.parse(raw));
    } catch {}
  }, []);

  // Calculate loan amount based on loan type
  const getLoanAmount = () => {
    if (loanData.loanType === 'purchase') {
      return loanData.purchasePrice - loanData.downPayment;
    }
    return loanData.refinanceLoanAmount;
  };

  // Calculate down payment percentage
  const getDownPaymentPercent = () => {
    if (loanData.loanType === 'purchase' && loanData.purchasePrice > 0) {
      return (loanData.downPayment / loanData.purchasePrice) * 100;
    }
    return 0;
  };

  // Calculate LTV for refinance
  const getLTV = () => {
    if (loanData.loanType === 'refinance' && loanData.currentPropertyValue > 0) {
      return (loanData.refinanceLoanAmount / loanData.currentPropertyValue) * 100;
    }
    return 0;
  };

  // Calculate monthly payment
  const calculateMonthlyPayment = (principal: number, rate: number, years: number) => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) {
      return principal / numPayments;
    }
    
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                    (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return payment;
  };

  // Check if MI is required
  const requiresMI = () => {
    if (loanData.loanType === 'purchase') {
      return getDownPaymentPercent() < 20;
    } else {
      return getLTV() > 80;
    }
  };

  // Calculate monthly MI
  const calculateMonthlyMI = () => {
    if (requiresMI()) {
      return (getLoanAmount() * 0.005) / 12; // 0.5% annually
    }
    return 0;
  };

  // Add new program
    const addProgram = () => {
    const existingTypes = loanData.programs.reduce((acc: { [key: string]: number }, prog) => {
      const key = `${prog.type}-${prog.term}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    const newType = 'conventional';
    const newTerm = 30;
    const key = `${newType}-${newTerm}`;
    const instanceNum = existingTypes[key] ? existingTypes[key] + 1 : 1;
    
    const newProgram = {
      id: Date.now(),
      type: newType,
      rate: 7.000,
      term: newTerm,
      selected: true,
      name: `Conventional Fixed 30yr${instanceNum > 1 ? ` (${instanceNum})` : ''}`,
      buyDown: false,
      buyDownCost: 0,
      effectiveRate: 7.000
    };
    
    setLoanData({
      ...loanData,
      programs: [...loanData.programs, newProgram]
    });
  };

  // Remove program
  const removeProgram = (id: number) => {
    if (loanData.programs.length > 1) {
      // Clear preferred if the preferred program is removed
      if (preferredProgramId === id) {
        setPreferredProgramId(null);
      }
      setLoanData({
        ...loanData,
        programs: loanData.programs.filter(p => p.id !== id)
      });
    }
  };

  // Reorder programs
  const moveProgram = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= loanData.programs.length || fromIndex === toIndex) return;
    const newPrograms = [...loanData.programs];
    const [moved] = newPrograms.splice(fromIndex, 1);
    newPrograms.splice(toIndex, 0, moved);
    setLoanData({ ...loanData, programs: newPrograms });
  };

  const moveProgramUp = (id: number) => {
    const idx = loanData.programs.findIndex(p => p.id === id);
    if (idx > 0) moveProgram(idx, idx - 1);
  };

  const moveProgramDown = (id: number) => {
    const idx = loanData.programs.findIndex(p => p.id === id);
    if (idx >= 0 && idx < loanData.programs.length - 1) moveProgram(idx, idx + 1);
  };

  // Update program
  const updateProgram = (id: number, updates: Partial<Program>) => {
    setLoanData({
      ...loanData,
      programs: loanData.programs.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          
          // If this program is deselected, clear preferred selection if it was preferred
          if ('selected' in updates && updates.selected === false && preferredProgramId === id) {
            setPreferredProgramId(null);
          }
          
          // Handle rate buydown calculations
          if ('buyDownCost' in updates || 'effectiveRate' in updates) {
            const reduction = p.rate - (updates.effectiveRate || p.effectiveRate);
            updated.rateReduction = reduction > 0 ? reduction : 0;
          }
          
          // Auto-generate name if type or term changes
          if ('type' in updates || 'term' in updates) {
            const programType = updates.type || p.type;
            const programTerm = updates.term || p.term;
            let typeName = '';
            
            switch(programType) {
              case 'conventional':
                typeName = 'Conventional Fixed';
                break;
              case '3arm':
                typeName = '3/1 ARM';
                break;
              case '5arm':
                typeName = '5/1 ARM';
                break;
              case '7arm':
                typeName = '7/1 ARM';
                break;
            }
            
            updated.name = `${typeName} ${programTerm}yr`;
          }
          
          return updated;
        }
        return p;
      })
    });
  };

  // Get selected programs for comparison
  const getSelectedPrograms = () => {
    return loanData.programs.filter(p => p.selected);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Use program-specific loan amount when provided
  const getProgramLoanAmount = (program: Program) => {
    return program.overrideLoanAmount && program.overrideLoanAmount > 0
      ? program.overrideLoanAmount
      : getLoanAmount();
  };

  // Calculate total PITI for a given program
  const calculateTotalPITI = (program: Program) => {
    const rate = program.buyDown ? program.effectiveRate : program.rate;
    const principal = getProgramLoanAmount(program);
    const monthlyPI = calculateMonthlyPayment(principal, rate, program.term);
    const monthlyHOI = loanData.hoi / 12;
    const monthlyTaxes = loanData.propertyTaxes / 12;
    const monthlyMI = calculateMonthlyMIForProgram(program);
    return monthlyPI + monthlyHOI + monthlyTaxes + monthlyMI;
  };

  // Program-aware MI calculation (mostly impacts refinance with overrideLoanAmount)
  const calculateMonthlyMIForProgram = (program: Program) => {
    if (loanData.loanType === 'purchase') {
      return calculateMonthlyMI();
    }
    // refinance: base MI on program-specific LTV
    const principal = getProgramLoanAmount(program);
    if (loanData.currentPropertyValue > 0) {
      const ltv = (principal / loanData.currentPropertyValue) * 100;
      if (ltv > 80) {
        return (principal * 0.005) / 12;
      }
    }
    return 0;
  };

  // --- Export helpers ---
  const htmlEscape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c] as string));

  const buildComparisonTableHTML = () => {
    const selected = getSelectedPrograms();
    if (selected.length === 0) return '<div>No programs selected.</div>';
    const thStyle = 'style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:left"';
    const tdStyle = 'style="border:1px solid #ccc;padding:6px;text-align:center"';
    const tdLeft = 'style="border:1px solid #ccc;padding:6px;text-align:left"';
    const header = `<tr><th ${thStyle}>Metric</th>${selected.map(p=>`<th ${thStyle}>${htmlEscape(p.name)}</th>`).join('')}</tr>`;
    const programType = `<tr><td ${tdLeft}>Program Type</td>${selected.map(p=>`<td ${tdStyle}>${p.type==='conventional'?'Conventional Fixed':htmlEscape(getARMDetails(p.type)?.name||'')}</td>`).join('')}</tr>`;
    const term = `<tr><td ${tdLeft}>Term</td>${selected.map(p=>`<td ${tdStyle}>${p.term} years</td>`).join('')}</tr>`;
    const interest = `<tr><td ${tdLeft}>Interest Rate</td>${selected.map(p=>{
      return `<td ${tdStyle}>${p.buyDown ? `<span style="text-decoration:line-through;color:#9ca3af">${p.rate.toFixed(3)}%</span> <span style="color:#047857;font-weight:600">${p.effectiveRate.toFixed(3)}%</span><div style="color:#2563eb;font-size:12px">(-${(p.rate-p.effectiveRate).toFixed(3)}%)</div>` : `${p.rate.toFixed(3)}%`}</td>`;
    }).join('')}</tr>`;
    const loanAmt = `<tr style="background:#eff6ff"><td ${tdLeft}>Loan Amount</td>${selected.map(p=>`<td ${tdStyle}>${formatCurrency(getProgramLoanAmount(p))}</td>`).join('')}</tr>`;
    const buydownCost = `<tr><td ${tdLeft}>Upfront Buy-Down Cost</td>${selected.map(p=>`<td ${tdStyle}>${p.buyDown ? `<span style="color:#dc2626;font-weight:600">${formatCurrency(p.buyDownCost)}</span>`:'<span style="color:#9ca3af">N/A</span>'}</td>`).join('')}</tr>`;
    const monthlyPI = `<tr style="background:#eff6ff"><td ${tdLeft}>Monthly P&I</td>${selected.map(p=>{const r=p.buyDown?p.effectiveRate:p.rate;const pi=calculateMonthlyPayment(getLoanAmount(),r,p.term);return `<td ${tdStyle}><span style="color:#2563eb;font-weight:700">${formatCurrency(pi)}</span></td>`;}).join('')}</tr>`;
    const hoi = `<tr><td ${tdLeft}>Monthly HOI</td>${selected.map(()=>`<td ${tdStyle}>${formatCurrency(loanData.hoi/12)}</td>`).join('')}</tr>`;
    const taxes = `<tr><td ${tdLeft}>Monthly Taxes</td>${selected.map(()=>`<td ${tdStyle}>${formatCurrency(loanData.propertyTaxes/12)}</td>`).join('')}</tr>`;
    const mi = `<tr><td ${tdLeft}>Monthly MI <div style="font-size:12px;color:#6b7280">${loanData.loanType==='purchase'?'(<20% down)':'(>80% LTV)'}</div></td>${selected.map(()=>{const m=calculateMonthlyMI();return `<td ${tdStyle}>${m>0?formatCurrency(m):'<span style=\"color:#9ca3af\">N/A</span>'}</td>`;}).join('')}</tr>`;
    const total = `<tr style="background:#eff6ff"><td ${tdLeft}>Total Monthly Payment (PITI)</td>${selected.map(p=>{const r=p.buyDown?p.effectiveRate:p.rate;const pi=calculateMonthlyPayment(getLoanAmount(),r,p.term);const t=pi+loanData.hoi/12+loanData.propertyTaxes/12+calculateMonthlyMI();return `<td ${tdStyle}><span style="color:#2563eb;font-weight:700">${formatCurrency(t)}</span></td>`;}).join('')}</tr>`;
    const showArm = selected.some(p=>p.type!=='conventional');
    const arm = showArm?`<tr><td ${tdLeft}>ARM Details</td>${selected.map(p=>{const d=getARMDetails(p.type);return `<td ${tdStyle}>${d?`<div>Fixed for ${d.fixedYears} years</div><div>Caps: 2-2-5</div><div style=\"color:#6b7280\">Max rate: ${(p.rate+5).toFixed(3)}%</div>`:'<span style=\"color:#9ca3af\">N/A</span>'}</td>`;}).join('')}</tr>`:'';
    return `<table style="border-collapse:collapse;width:100%">${header}${programType}${term}${interest}${loanAmt}${buydownCost}${monthlyPI}${hoi}${taxes}${mi}${total}${arm}</table>`;
  };

  const buildRecommendationHTML = () => {
    const preferred = loanData.programs.find(p=>p.id===preferredProgramId && p.selected);
    const th = 'style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:600"';
    const td = 'style="padding:8px;border:1px solid #e5e7eb"';
    if (!preferred) return '<div><em>No preferred program selected.</em></div>';
    const rate = preferred.buyDown?preferred.effectiveRate:preferred.rate;
    const principal = getProgramLoanAmount(preferred);
    const total = calculateTotalPITI(preferred);
    const savingsRow = (loanData.loanType==='refinance' && preferred.previousMonthlyPITI && preferred.previousMonthlyPITI > 0)
      ? (() => { const diff = preferred.previousMonthlyPITI! - total; const isSave = diff >= 0; const color = isSave ? '#047857' : '#dc2626'; const label = isSave ? 'Savings vs current' : 'Increase vs current'; return `<tr><td ${td}>${label}</td><td ${td}><span style="color:${color}">${formatCurrency(Math.abs(diff))}/mo</span></td></tr>`; })()
      : '';
    return `
      <table style="border-collapse:collapse;width:100%;margin-top:12px">
        <tr><th ${th}>Preferred Recommendation</th><th ${th}></th></tr>
        <tr><td ${td}>Program</td><td ${td}>${htmlEscape(preferred.name)}</td></tr>
        <tr><td ${td}>Rate</td><td ${td}>${preferred.buyDown?`<span style=\"text-decoration:line-through;color:#9ca3af\">${preferred.rate.toFixed(3)}%</span> <span style=\"color:#047857;font-weight:700\">${preferred.effectiveRate.toFixed(3)}%</span>`:`${rate.toFixed(3)}%`}</td></tr>
        <tr><td ${td}>Loan Amount</td><td ${td}>${formatCurrency(principal)}</td></tr>
        <tr><td ${td}>Term</td><td ${td}>${preferred.term} years</td></tr>
        <tr><td ${td}>Estimated PITI</td><td ${td}>${formatCurrency(total)}</td></tr>
        ${savingsRow}
      </table>
    `;
  };

  const buildBuydownHTML = () => {
    const buydownPrograms = getSelectedPrograms().filter(p=>p.buyDown);
    const rows = buydownPrograms.map(p=>{
      const normal = calculateMonthlyPayment(getProgramLoanAmount(p), p.rate, p.term);
      const reduced = calculateMonthlyPayment(getProgramLoanAmount(p), p.effectiveRate, p.term);
      const monthlySavings = normal - reduced;
      const breakEvenMonths = p.buyDownCost && monthlySavings>0 ? (p.buyDownCost / monthlySavings) : 0;
      return `<tr>
        <td style=\"padding:8px;border:1px solid #e5e7eb\">${htmlEscape(p.name)}</td>
        <td style=\"padding:8px;border:1px solid #e5e7eb\">${formatCurrency(monthlySavings)}</td>
        <td style=\"padding:8px;border:1px solid #e5e7eb\">${breakEvenMonths?`${Math.ceil(breakEvenMonths)} months (${(breakEvenMonths/12).toFixed(1)} years)`: '<span style="color:#9ca3af">N/A</span>'}</td>
      </tr>`;
    }).join('');
    if (!rows) return '';
    const note = `<div style=\"font-size:12px;color:#6b7280;margin:6px 0\">A rate buy-down is an upfront fee paid at closing to lower the interest rate and monthly payment. The break-even point estimates how long it takes for monthly savings to recoup the upfront cost.</div>`;
    return `
      <div style="margin-top:16px">
        <h3 style="margin:0 0 6px 0;color:#374151">Buy-Down Break-Even Analysis</h3>
        ${note}
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:600">Program</th>
            <th style="padding:8px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:600">Monthly savings</th>
            <th style="padding:8px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:600">Break-even</th>
          </tr>
          ${rows}
        </table>
      </div>
    `;
  };

  const buildExportHTML = () => {
    const title = '<h2 style="margin:0 0 8px 0;font-family:Segoe UI,Arial,sans-serif;color:#374151">Comparison Results</h2>';
    const rec = buildRecommendationHTML();
    const buydown = buildBuydownHTML();
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#111827">
        ${title}
        ${buildComparisonTableHTML()}
        ${rec}
        ${buydown}
      </div>
    `;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    // Windows/Edge legacy support ensures proper extension handling
    const anyNav: any = window.navigator;
    if (anyNav && typeof anyNav.msSaveOrOpenBlob === 'function') {
      anyNav.msSaveOrOpenBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    // Some browsers require the element to be in the DOM
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const htmlContent = buildExportHTML();
    const excelDoc = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${htmlContent}</body></html>`;
    // Prepend BOM and set explicit charset for reliability
    const blob = new Blob(["\ufeff", excelDoc], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const filename = `loan_comparison_${new Date().toISOString().slice(0,10)}.xls`;
    downloadBlob(blob, filename);
  };

  const exportToOutlookEML = () => {
    const subject = 'Loan Comparison Results';
    const bodyHtml = buildExportHTML();
    const eml = `From: \r\nTo: \r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${bodyHtml}`;
    const blob = new Blob([eml], { type: 'message/rfc822' });
    downloadBlob(blob, 'loan_comparison.eml');
  };

  const copyTableToClipboard = async () => {
    const html = buildExportHTML();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      // Modern async clipboard API with HTML
      // @ts-ignore ClipboardItem may not be in lib.dom.d.ts in some TS versions
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
      // Optionally, show a small toast in future
    } catch (e) {
      // Fallback: open a temp window for manual copy
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    }
  };

  // Get ARM details
  const getARMDetails = (type: string) => {
    switch(type) {
      case '3arm':
        return { fixedYears: 3, name: '3/1 ARM' };
      case '5arm':
        return { fixedYears: 5, name: '5/1 ARM' };
      case '7arm':
        return { fixedYears: 7, name: '7/1 ARM' };
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Loan Program Comparison Tool</h1>
      
      {/* Section 1: Loan Parameters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Loan Parameters</h2>
        
        {/* Loan Type Selection */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="loanType"
                value="purchase"
                checked={loanData.loanType === 'purchase'}
                onChange={(e) => setLoanData({...loanData, loanType: e.target.value as 'purchase' | 'refinance'})}
                className="mr-2"
              />
              <span className="font-medium">Purchase</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="loanType"
                value="refinance"
                checked={loanData.loanType === 'refinance'}
                onChange={(e) => setLoanData({...loanData, loanType: e.target.value as 'purchase' | 'refinance'})}
                className="mr-2"
              />
              <span className="font-medium">Refinance</span>
            </label>
          </div>
          
          {/* Purchase Mode Fields */}
          {loanData.loanType === 'purchase' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Purchase Price
                </label>
                <input
                  type="number"
                  value={loanData.purchasePrice}
                  onChange={(e) => setLoanData({...loanData, purchasePrice: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Down Payment
                </label>
                <input
                  type="number"
                  value={loanData.downPayment}
                  onChange={(e) => setLoanData({...loanData, downPayment: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Loan Amount
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md font-medium">
                  {formatCurrency(getLoanAmount())}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Down Payment %
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md font-medium">
                  {getDownPaymentPercent().toFixed(3)}%
                </div>
              </div>
            </div>
          )}
          
          {/* Refinance Mode Fields */}
          {loanData.loanType === 'refinance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  New Loan Amount
                </label>
                <input
                  type="number"
                  value={loanData.refinanceLoanAmount}
                  onChange={(e) => setLoanData({...loanData, refinanceLoanAmount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Current Property Value
                </label>
                <input
                  type="number"
                  value={loanData.currentPropertyValue}
                  onChange={(e) => setLoanData({...loanData, currentPropertyValue: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Estimated LTV %
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md font-medium">
                  {getLTV().toFixed(3)}%
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Annual HOI (Homeowner's Insurance)
                </label>
                <input
                  type="number"
                  value={loanData.hoi}
                  onChange={(e) => setLoanData({...loanData, hoi: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Annual Property Taxes
                </label>
                <input
                  type="number"
                  value={loanData.propertyTaxes}
                  onChange={(e) => setLoanData({...loanData, propertyTaxes: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          
          {/* Common Fields (Purchase only) */}
          {loanData.loanType === 'purchase' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Annual HOI (Homeowner's Insurance)
                </label>
                <input
                  type="number"
                  value={loanData.hoi}
                  onChange={(e) => setLoanData({...loanData, hoi: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Annual Property Taxes
                </label>
                <input
                  type="number"
                  value={loanData.propertyTaxes}
                  onChange={(e) => setLoanData({...loanData, propertyTaxes: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Section 2: Program Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Program Configuration</h2>
          <button
            onClick={addProgram}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Program
          </button>
        </div>
        {/* Scenario toolbar */}
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Scenario name (e.g., Refi Option A)"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ minWidth: 240 }}
            />
            <button
              onClick={() => {
                const name = (scenarioName || `Scenario ${new Date().toLocaleString()}`).trim();
                const payload: ScenarioPayloadV1 = { version: 1, name, loanData: JSON.parse(JSON.stringify(loanData)), preferredProgramId };
                setScenarioName(name);
                setSavedScenarios(prev => {
                  const existingIndex = prev.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
                  let next: SavedScenario[];
                  if (existingIndex >= 0) {
                    next = [...prev];
                    next[existingIndex] = { ...next[existingIndex], payload, updatedAt: new Date().toISOString() };
                  } else {
                    next = [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name, payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
                  }
                  try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next)); } catch {}
                  return next;
                });
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              title="Save scenario to this browser"
            >
              Save Scenario
            </button>
            <button
              onClick={() => {
                const name = (scenarioName || 'scenario').replace(/\s+/g, '_');
                const payload: ScenarioPayloadV1 = { version: 1, name: scenarioName, loanData, preferredProgramId };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.setAttribute('download', `${name}.json`);
                document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              title="Export current scenario to .json"
            >
              Export JSON
            </button>
            <button
              onClick={async () => {
                try {
                  const payload: ScenarioPayloadV1 = { version: 1, name: scenarioName, loanData, preferredProgramId };
                  const json = JSON.stringify(payload, null, 2);
                  await navigator.clipboard.writeText(json);
                } catch {}
              }}
              className="px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              title="Copy current scenario JSON to clipboard"
            >
              Copy JSON
            </button>
            <button
              onClick={() => setShowImport(v => !v)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              title="Import a scenario by pasting JSON or uploading a file"
            >
              Import JSON
            </button>
          </div>
          {showImport && (
            <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-1">Paste JSON</div>
              <textarea
                rows={6}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"version":1,"loanData":{...}}'
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    try {
                      const data = JSON.parse(importJsonText);
                      if (data && data.loanData && 'preferredProgramId' in data) {
                        setLoanData(data.loanData);
                        setPreferredProgramId(data.preferredProgramId ?? null);
                        setScenarioName((data.name || '').toString());
                        setShowImport(false);
                        setImportJsonText('');
                      }
                    } catch {}
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Import from Paste
                </button>
                <label className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer">
                  Upload File
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        if (data && data.loanData && 'preferredProgramId' in data) {
                          setLoanData(data.loanData);
                          setPreferredProgramId(data.preferredProgramId ?? null);
                          setScenarioName((data.name || '').toString());
                          setShowImport(false);
                          setImportJsonText('');
                        }
                      } catch {}
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </label>
                <button
                  onClick={() => { setShowImport(false); setImportJsonText(''); }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {savedScenarios.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minWidth: 260 }}
              >
                <option value="">Select saved scenario…</option>
                {savedScenarios.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({new Date(s.updatedAt).toLocaleString()})</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const s = savedScenarios.find(ss => ss.id === selectedScenarioId);
                  if (!s) return;
                  setLoanData(s.payload.loanData);
                  setPreferredProgramId(s.payload.preferredProgramId);
                  setScenarioName(s.name);
                }}
                disabled={!selectedScenarioId}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40"
              >
                Load
              </button>
              <button
                onClick={() => {
                  if (!selectedScenarioId) return;
                  setSavedScenarios(prev => {
                    const next = prev.filter(s => s.id !== selectedScenarioId);
                    try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next)); } catch {}
                    return next;
                  });
                  setSelectedScenarioId('');
                }}
                disabled={!selectedScenarioId}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {loanData.programs.map((program, index) => (
            <div
              key={program.id}
              className={`border rounded-lg p-4 ${preferredProgramId === program.id ? 'border-green-500 ring-2 ring-green-300 bg-green-50' : 'border-gray-200'}`}
            >
              {preferredProgramId === program.id && program.selected && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded">
                    Recommended
                  </span>
                </div>
              )}
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={program.selected}
                  onChange={(e) => updateProgram(program.id, { selected: e.target.checked })}
                  className="mt-1"
                />
                {/* Preferred recommendation selector */}
                <input
                  type="radio"
                  name="preferredProgram"
                  checked={preferredProgramId === program.id}
                  onChange={() => setPreferredProgramId(program.id)}
                  disabled={!program.selected}
                  className="mt-1"
                  title={!program.selected ? 'Select program to enable preference' : 'Mark as preferred recommendation'}
                />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Program Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Program Type
                    </label>
                    <select
                      value={program.type}
                      onChange={(e) => updateProgram(program.id, { type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="conventional">Conventional Fixed</option>
                      <option value="3arm">3/1 ARM</option>
                      <option value="5arm">5/1 ARM</option>
                      <option value="7arm">7/1 ARM</option>
                    </select>
                  </div>
                  
                  {/* Term */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Term
                    </label>
                    <select
                      value={program.term}
                      onChange={(e) => updateProgram(program.id, { term: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="15">15 years</option>
                      <option value="20">20 years</option>
                      <option value="25">25 years</option>
                      <option value="30">30 years</option>
                    </select>
                  </div>
                  
                  {/* Interest Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={program.rate}
                      onChange={(e) => updateProgram(program.id, { rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Override Loan Amount (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Override Loan Amount (optional)
                    </label>
                    <input
                      type="number"
                      value={program.overrideLoanAmount ?? ''}
                      onChange={(e) => updateProgram(program.id, { overrideLoanAmount: e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={getLoanAmount().toString()}
                    />
                  </div>
                  
                  {/* Custom Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Custom Name
                    </label>
                    <input
                      type="text"
                      value={program.name}
                      onChange={(e) => updateProgram(program.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* ARM Details */}
                  {program.type !== 'conventional' && (
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Info size={16} />
                        <span>ARM Caps: 2-2-5 (Fixed for {getARMDetails(program.type)?.fixedYears} years)</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Order Controls + Remove */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => moveProgramUp(program.id)}
                    disabled={index === 0}
                    className="p-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    title="Move up"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    onClick={() => moveProgramDown(program.id)}
                    disabled={index === loanData.programs.length - 1}
                    className="p-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    title="Move down"
                  >
                    <ChevronDown size={18} />
                  </button>
                  {loanData.programs.length > 1 && (
                    <button
                      onClick={() => removeProgram(program.id)}
                      className="text-red-600 hover:text-red-700 mt-1"
                      title="Remove program"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Rate Buydown Feature */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => updateProgram(program.id, { buyDown: !program.buyDown })}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    program.buyDown 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Rate Buy-Down: {program.buyDown ? 'Enabled' : 'Enable'}
                </button>
                
                {program.buyDown && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Rate Buy-Down Cost
                      </label>
                      <input
                        type="number"
                        value={program.buyDownCost}
                        onChange={(e) => updateProgram(program.id, { buyDownCost: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Effective Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={program.effectiveRate}
                        onChange={(e) => updateProgram(program.id, { effectiveRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="mt-1 text-sm">
                        <span className="line-through text-gray-400">{program.rate.toFixed(3)}%</span>
                        <span className="text-green-700 font-medium ml-2">{program.effectiveRate.toFixed(3)}%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Rate Reduction
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md font-medium">
                        {(program.rate - program.effectiveRate).toFixed(3)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Refinance current vs new comparison */}
                {loanData.loanType === 'refinance' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Current Monthly (PITI)
                      </label>
                      <input
                        type="number"
                        value={program.previousMonthlyPITI ?? ''}
                        onChange={(e) => updateProgram(program.id, { previousMonthlyPITI: e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2500"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <div className="px-3 py-2 bg-gray-50 rounded-md">
                        {(() => {
                          const total = calculateTotalPITI(program);
                          const prev = program.previousMonthlyPITI;
                          if (prev && prev > 0) {
                            const diff = prev - total;
                            return <span className={diff >= 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>Monthly savings vs current: {formatCurrency(diff)}</span>;
                          }
                          return <span className="text-gray-500">Enter current monthly PITI to see estimated savings</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Section 3: Comparison Results */}
      {getSelectedPrograms().length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Comparison Results</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={copyTableToClipboard}
              className="px-3 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >Copy table</button>
            <button
              onClick={exportToExcel}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >Export to Excel</button>
            <button
              onClick={exportToOutlookEML}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >Draft Outlook Email</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left p-3 font-semibold text-gray-700">Metric</th>
                  {getSelectedPrograms().map(program => (
                    <th
                      key={program.id}
                      className={`text-center p-3 font-semibold text-gray-700 ${preferredProgramId === program.id ? 'bg-green-50 border-t-4 border-green-500' : ''}`}
                    >
                      <div>{program.name}</div>
                      {preferredProgramId === program.id && (
                        <div className="text-xs text-green-700 font-medium mt-1">Recommended</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Program Type */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Program Type</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {program.type === 'conventional' ? 'Conventional Fixed' : getARMDetails(program.type)?.name}
                    </td>
                  ))}
                </tr>
                
                {/* Term */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Term</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {program.term} years
                    </td>
                  ))}
                </tr>
                
                {/* Interest Rate */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Interest Rate</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {program.buyDown ? (
                        <div>
                          <span className="line-through text-gray-400">{program.rate.toFixed(3)}%</span>
                          <span className="text-green-600 font-medium ml-2">{program.effectiveRate.toFixed(3)}%</span>
                          <span className="text-blue-600 text-sm block">(-{(program.rate - program.effectiveRate).toFixed(3)}%)</span>
                        </div>
                      ) : (
                        <span>{program.rate.toFixed(3)}%</span>
                      )}
                    </td>
                  ))}
                </tr>
                
                {/* Loan Amount */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Loan Amount</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {formatCurrency(getProgramLoanAmount(program))}
                    </td>
                  ))}
                </tr>
                
                {/* Upfront Buy-Down Cost */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Upfront Buy-Down Cost</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {program.buyDown ? (
                        <span className="text-red-600 font-medium">{formatCurrency(program.buyDownCost)}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>
                
                {/* Buy-Down Analysis */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Buy-Down Analysis</td>
                  {getSelectedPrograms().map(program => {
                    if (!program.buyDown || !program.buyDownCost || program.buyDownCost <= 0) {
                      return (
                        <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                          <span className="text-gray-400">N/A</span>
                        </td>
                      );
                    }
                    const loanAmt = getProgramLoanAmount(program);
                    const normalPayment = calculateMonthlyPayment(loanAmt, program.rate, program.term);
                    const reducedPayment = calculateMonthlyPayment(loanAmt, program.effectiveRate, program.term);
                    const monthlySavings = normalPayment - reducedPayment;
                    if (monthlySavings <= 0) {
                      return (
                        <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                          <span className="text-gray-400">N/A</span>
                        </td>
                      );
                    }
                    const breakEvenMonths = program.buyDownCost / monthlySavings;
                    return (
                      <td key={program.id} className={`text-center p-3 text-sm ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                        <div>Save {formatCurrency(monthlySavings)}/mo</div>
                        <div className="text-gray-600">Break-even: {Math.ceil(breakEvenMonths)} mo ({(breakEvenMonths / 12).toFixed(1)} yr)</div>
                      </td>
                    );
                  })}
                </tr>
                
                {/* Monthly P&I */}
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="p-3 font-medium text-gray-600">Monthly P&I</td>
                  {getSelectedPrograms().map(program => {
                    const rate = program.buyDown ? program.effectiveRate : program.rate;
                    const monthlyPI = calculateMonthlyPayment(getProgramLoanAmount(program), rate, program.term);
                    return (
                      <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                        <span className="text-blue-600 font-bold text-lg">{formatCurrency(monthlyPI)}</span>
                      </td>
                    );
                  })}
                </tr>
                
                {/* Monthly HOI */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Monthly HOI</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {formatCurrency(loanData.hoi / 12)}
                    </td>
                  ))}
                </tr>
                
                {/* Monthly Taxes */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Monthly Taxes</td>
                  {getSelectedPrograms().map(program => (
                    <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                      {formatCurrency(loanData.propertyTaxes / 12)}
                    </td>
                  ))}
                </tr>
                
                {/* Monthly MI */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">
                    Monthly MI
                    <span className="text-sm text-gray-500 block">
                      {loanData.loanType === 'purchase' ? '(<20% down)' : '(>80% LTV)'}
                    </span>
                  </td>
                  {getSelectedPrograms().map(program => {
                    const monthlyMI = calculateMonthlyMI();
                    return (
                      <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                        {monthlyMI > 0 ? formatCurrency(monthlyMI) : <span className="text-gray-400">N/A</span>}
                      </td>
                    );
                  })}
                </tr>
                
                {/* Monthly Savings vs Current PITI */}
                <tr className="border-b border-gray-200">
                  <td className="p-3 font-medium text-gray-600">Monthly Savings vs Current</td>
                  {getSelectedPrograms().map(program => {
                    if (loanData.loanType !== 'refinance' || !program.previousMonthlyPITI || program.previousMonthlyPITI <= 0) {
                      return (
                        <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                          <span className="text-gray-400">N/A</span>
                        </td>
                      );
                    }
                    const rate = program.buyDown ? program.effectiveRate : program.rate;
                    const monthlyPI = calculateMonthlyPayment(getProgramLoanAmount(program), rate, program.term);
                    const monthlyHOI = loanData.hoi / 12;
                    const monthlyTaxes = loanData.propertyTaxes / 12;
                    const monthlyMI = calculateMonthlyMI();
                    const total = monthlyPI + monthlyHOI + monthlyTaxes + monthlyMI;
                    const savings = program.previousMonthlyPITI - total;
                    const isPositive = savings >= 0;
                    return (
                      <td key={program.id} className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                        <span className={`${isPositive ? 'text-green-700' : 'text-red-600'} font-medium`}>
                          {isPositive ? '+' : '-'}{formatCurrency(Math.abs(savings))}/mo
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Total Monthly Payment (PITI) */}
                <tr className="border-b border-gray-200 bg-blue-50">
                  <td className="p-3 font-medium text-gray-600">Total Monthly Payment (PITI)</td>
                  {getSelectedPrograms().map(program => {
                    const rate = program.buyDown ? program.effectiveRate : program.rate;
                    const monthlyPI = calculateMonthlyPayment(getProgramLoanAmount(program), rate, program.term);
                    const monthlyHOI = loanData.hoi / 12;
                    const monthlyTaxes = loanData.propertyTaxes / 12;
                    const monthlyMI = calculateMonthlyMI();
                    const total = monthlyPI + monthlyHOI + monthlyTaxes + monthlyMI;
                    
                    return (
                      <td
                        key={program.id}
                        className={`text-center p-3 ${preferredProgramId === program.id ? 'bg-green-50 ring-1 ring-green-300' : ''}`}
                      >
                        <span className="text-blue-600 font-bold text-lg">{formatCurrency(total)}</span>
                      </td>
                    );
                  })}
                </tr>
                
                {/* ARM Details */}
                {getSelectedPrograms().some(p => p.type !== 'conventional') && (
                  <tr className="border-b border-gray-200">
                    <td className="p-3 font-medium text-gray-600">ARM Details</td>
                    {getSelectedPrograms().map(program => {
                      const armDetails = getARMDetails(program.type);
                      return (
                        <td key={program.id} className={`text-center p-3 text-sm ${preferredProgramId === program.id ? 'bg-green-50' : ''}`}>
                          {armDetails ? (
                            <div>
                              <div>Fixed for {armDetails.fixedYears} years</div>
                              <div>Caps: 2-2-5</div>
                              <div className="text-gray-500">Max rate: {(program.rate + 5).toFixed(3)}%</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Buydown Break-Even Analysis */}
          {getSelectedPrograms().some(p => p.buyDown) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Buy-Down Break-Even Analysis</h3>
              <div className="space-y-2">
                {getSelectedPrograms().filter(p => p.buyDown).map(program => {
                  const normalPayment = calculateMonthlyPayment(getLoanAmount(), program.rate, program.term);
                  const reducedPayment = calculateMonthlyPayment(getLoanAmount(), program.effectiveRate, program.term);
                  const monthlySavings = normalPayment - reducedPayment;
                  const breakEvenMonths = program.buyDownCost / monthlySavings;
                  
                  return (
                    <div key={program.id} className="text-sm">
                      <span className="font-medium">{program.name}:</span>
                      <span className="ml-2">Monthly savings: {formatCurrency(monthlySavings)}</span>
                      <span className="ml-4">Break-even: {Math.ceil(breakEvenMonths)} months ({(breakEvenMonths / 12).toFixed(1)} years)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preferred Recommendation Summary */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Preferred Recommendation</h3>
            {(() => {
              const preferred = loanData.programs.find(p => p.id === preferredProgramId && p.selected);
              if (!preferred) {
                return (
                  <div className="text-sm text-gray-600">
                    No preferred program selected. Use the radio next to a program above to mark it as your recommendation.
                  </div>
                );
              }
              const rate = preferred.buyDown ? preferred.effectiveRate : preferred.rate;
              const total = calculateTotalPITI(preferred);
              return (
                <div className="text-sm">
                  <div className="mt-1">
                    <span className="font-medium">Program:</span>
                    <span className="ml-2">{preferred.name}</span>
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">Rate:</span>
                    {preferred.buyDown ? (
                      <span className="ml-2">
                        <span className="line-through text-gray-400">{preferred.rate.toFixed(3)}%</span>
                        <span className="text-green-700 ml-2">{preferred.effectiveRate.toFixed(3)}%</span>
                      </span>
                    ) : (
                      <span className="ml-2">{rate.toFixed(3)}%</span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">Loan Amount:</span>
                    <span className="ml-2">{formatCurrency(getProgramLoanAmount(preferred))}</span>
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">Term:</span>
                    <span className="ml-2">{preferred.term} years</span>
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">Estimated PITI:</span>
                    <span className="ml-2">{formatCurrency(total)}</span>
                  </div>
                  {loanData.loanType === 'refinance' && preferred.previousMonthlyPITI && preferred.previousMonthlyPITI > 0 && (
                    <div className="mt-1">
                      <span className="font-medium">Savings vs current:</span>
                      <span className={`ml-2 ${preferred.previousMonthlyPITI - total >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(preferred.previousMonthlyPITI - total))} {preferred.previousMonthlyPITI - total >= 0 ? 'per month' : 'increase/mo'}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-600">
                    Rates are not final and are subject to change pending final underwriting approval.
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanComparisonTool;