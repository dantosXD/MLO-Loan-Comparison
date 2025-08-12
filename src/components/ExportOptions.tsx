import React, { useState } from 'react';
import { Copy, FileDown, FileText, Settings, Eye, GripVertical, X } from 'lucide-react';
import { Program, LoanData } from '../types';
import { 
  formatCurrency, 
  formatPercent,
  calculateMonthlyPayment,
  calculateTotalPITI,
  getLoanAmount,
  totalSelectedMonthlyDebts,
  totalRefinancedDebts,
  totalRefinancedMonthlyPayments
} from '../utils/calculations';
import * as XLSX from 'xlsx';

interface ExportOptionsProps {
  loanData: LoanData;
  selectedPrograms: Program[];
  preferredProgramId: number | null;
  preferredProgram: Program | null;
}

interface ExportSection {
  id: string;
  name: string;
  enabled: boolean;
}

interface ExportSections {
  comparisonTable: boolean;
  buydownAnalysis: boolean;
  recommendation: boolean;
  summary: boolean;
}

const ExportOptions: React.FC<ExportOptionsProps> = ({
  loanData,
  selectedPrograms,
  preferredProgramId,
  preferredProgram
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [sectionOrder, setSectionOrder] = useState<ExportSection[]>([
    { id: 'executiveSummary', name: 'Executive Summary', enabled: true },
    { id: 'summary', name: 'Summary Information', enabled: true },
    { id: 'comparisonTable', name: 'Loan Comparison Table', enabled: true },
    { id: 'totalCostAnalysis', name: 'Total Cost Analysis', enabled: true },
    { id: 'buydownAnalysis', name: 'Buydown Break-Even Analysis', enabled: true },
    { id: 'recommendation', name: 'Preferred Recommendation', enabled: true },
    { id: 'nextSteps', name: 'Next Steps & Action Items', enabled: true }
  ]);

  const [exportSections, setExportSections] = useState<ExportSections>({
    comparisonTable: true,
    buydownAnalysis: true,
    recommendation: true,
    summary: true
  });

  const handleSectionChange = (sectionId: string) => {
    setSectionOrder(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, enabled: !section.enabled }
          : section
      )
    );
    
    // Update the legacy exportSections state for backward compatibility
    setExportSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId as keyof ExportSections]
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newOrder = [...sectionOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    
    setSectionOrder(newOrder);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const generateComparisonTableHTML = (): string => {
    let html = '<div class="section">';
    html += '<h2 class="section-title">Loan Comparison Results</h2>';
    html += '<div class="table-container">';
    html += '<table>';
    html += '<thead><tr><th>Metric</th>';
    
    selectedPrograms.forEach(program => {
      const isPreferred = preferredProgramId === program.id;
      html += `<th class="center ${isPreferred ? 'preferred-header' : ''}">${program.name}`;
      if (isPreferred) {
        html += '<div class="recommended-badge">Recommended</div>';
      }
      html += '</th>';
    });
    html += '</tr></thead><tbody>';
    
    // Add comparison rows matching the component exactly
    const metrics = [
      { key: 'Program Type', getValue: (program: Program) => program.type.charAt(0).toUpperCase() + program.type.slice(1) },
      { key: 'Term', getValue: (program: Program) => `${program.term} years` },
      { 
        key: 'Interest Rate', 
        getValue: (program: Program) => {
          if (program.buyDown && program.effectiveRate !== program.rate) {
            return `<span class="strikethrough">${formatPercent(program.rate)}</span> → <span class="rate-reduction">${formatPercent(program.effectiveRate)}</span>`;
          }
          return formatPercent(program.rate);
        }
      },
      { key: 'Loan Amount', getValue: (program: Program) => formatCurrency(program.overrideLoanAmount || getLoanAmount(loanData)) },
      { 
        key: 'Monthly P&I', 
        getValue: (program: Program) => {
          const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
          return formatCurrency(calculateMonthlyPayment(program.overrideLoanAmount || getLoanAmount(loanData), effectiveRate, program.term));
        }
      },
      { key: 'Home Insurance', getValue: () => formatCurrency(loanData.annualHomeInsurance / 12) },
      { key: 'Property Taxes', getValue: () => formatCurrency(loanData.annualPropertyTax / 12) },
      { 
        key: 'Mortgage Insurance (MI)', 
        getValue: (program: Program) => {
          const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
          const loanToValue = loanData.loanType === 'purchase' 
            ? (loanAmount / loanData.purchasePrice) * 100 
            : 80;
          const needsMI = program.type === 'conventional' && loanToValue > 80;
          const miRate = needsMI ? 0.005 : 0;
          const monthlyMI = needsMI ? (loanAmount * miRate) / 12 : 0;
          return needsMI ? formatCurrency(monthlyMI) : 'N/A';
        }
      }
    ];

    // Add monthly savings row if any program has previousMonthlyPITI
    if (selectedPrograms.some(p => p.previousMonthlyPITI)) {
      metrics.push({
        key: 'Monthly Savings vs Current',
        getValue: (program: Program) => {
          const currentPITI = calculateTotalPITI(program, loanData);
          const savings = program.previousMonthlyPITI ? program.previousMonthlyPITI - currentPITI : 0;
          if (!program.previousMonthlyPITI) return 'N/A';
          const color = savings > 0 ? 'monthly-savings' : 'buydown-cost';
          return `<span class="${color}">${savings > 0 ? '+' : ''}${formatCurrency(savings)}</span>`;
        }
      });
    }

    // Add Total PITI row (highlighted)
    metrics.push({
      key: 'Total Monthly Payment (PITI)',
      getValue: (program: Program) => `<strong>${formatCurrency(calculateTotalPITI(program, loanData))}</strong>`
    });
    
    metrics.forEach(metric => {
      html += `<tr><td style="font-weight: 500;">${metric.key}</td>`;
      selectedPrograms.forEach(program => {
        const isPreferred = preferredProgramId === program.id;
        const cellClass = isPreferred ? 'center preferred-cell' : 'center';
        html += `<td class="${cellClass}">${metric.getValue(program)}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    // Add refinanced debt info if applicable (but not duplicate debt/income info since it's in summary)
    if (totalRefinancedDebts(loanData.debts) > 0) {
      html += '<div style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #10b981; font-size: 14px;">';
      html += `<p><strong>Total Refinanced Debt:</strong> ${formatCurrency(totalRefinancedDebts(loanData.debts))}</p>`;
      html += `<p><strong>Monthly Savings from Refinanced Debts:</strong> <span class="monthly-savings">${formatCurrency(totalRefinancedMonthlyPayments(loanData.debts))}</span></p>`;
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  };

  const generateBuydownAnalysisHTML = (): string => {
    const buydownPrograms = selectedPrograms.filter(program => program.buyDown && program.buyDownCost > 0);
    if (buydownPrograms.length === 0) return '';

    let html = '<div class="section">';
    html += '<h2 class="section-title">Buy-Down Break-Even Analysis</h2>';
    html += '<div class="table-container">';
    html += '<table>';
    html += '<thead><tr>';
    html += '<th>Program</th>';
    html += '<th class="center">Buy-Down Cost</th>';
    html += '<th class="center">Monthly Savings</th>';
    html += '<th class="center">Break-Even Period</th>';
    html += '<th class="center">Rate Reduction</th>';
    html += '</tr></thead><tbody>';

    buydownPrograms.forEach(program => {
      const effectiveRate = program.effectiveRate || program.rate;
      const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
      const originalPayment = calculateMonthlyPayment(loanAmount, program.rate, program.term);
      const buyDownPayment = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
      const monthlySavings = originalPayment - buyDownPayment;
      const breakEvenMonths = monthlySavings > 0 ? Math.ceil(program.buyDownCost / monthlySavings) : 0;
      const breakEvenYears = Math.floor(breakEvenMonths / 12);
      const remainingMonths = breakEvenMonths % 12;

      html += '<tr>';
      html += `<td style="font-weight: 500;">${program.name}</td>`;
      html += `<td class="center buydown-cost">${formatCurrency(program.buyDownCost)}</td>`;
      html += `<td class="center monthly-savings">${formatCurrency(monthlySavings)}</td>`;
      html += `<td class="center break-even">${breakEvenYears > 0 ? `${breakEvenYears}y ` : ''}${remainingMonths}m</td>`;
      html += `<td class="center rate-reduction">${(program.rate - effectiveRate).toFixed(3)}%</td>`;
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    html += '</div>';
    return html;
  };

  const generateRecommendationHTML = (): string => {
    if (!preferredProgram) return '';

    const effectiveRate = preferredProgram.buyDown ? preferredProgram.effectiveRate : preferredProgram.rate;
    const loanAmount = preferredProgram.overrideLoanAmount || getLoanAmount(loanData);
    const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, preferredProgram.term);
    const totalPITI = calculateTotalPITI(preferredProgram, loanData);
    const savings = preferredProgram.previousMonthlyPITI ? preferredProgram.previousMonthlyPITI - totalPITI : 0;

    let html = '<div class="section preferred-section">';
    html += '<h2 class="section-title preferred-title">';
    html += '<span class="star">★</span>';
    html += `Preferred Recommendation: ${preferredProgram.name}`;
    html += '</h2>';
    
    html += '<div class="grid">';
    
    // Program Details
    html += '<div>';
    html += '<h3 class="detail-section">Program Details</h3>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Program Type:</span>';
    html += `<span class="detail-value">${preferredProgram.type.charAt(0).toUpperCase() + preferredProgram.type.slice(1)}</span>`;
    html += '</div>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Term:</span>';
    html += `<span class="detail-value">${preferredProgram.term} years</span>`;
    html += '</div>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Interest Rate:</span>';
    if (preferredProgram.buyDown && preferredProgram.effectiveRate !== preferredProgram.rate) {
      html += `<span class="detail-value"><span class="strikethrough">${formatPercent(preferredProgram.rate)}</span> → <span class="rate-reduction">${formatPercent(preferredProgram.effectiveRate)}</span></span>`;
    } else {
      html += `<span class="detail-value">${formatPercent(preferredProgram.rate)}</span>`;
    }
    html += '</div>';
    html += '</div>';
    
    // Payment Details
    html += '<div>';
    html += '<h3 class="detail-section">Payment Details</h3>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Loan Amount:</span>';
    html += `<span class="detail-value">${formatCurrency(loanAmount)}</span>`;
    html += '</div>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Monthly P&I:</span>';
    html += `<span class="detail-value">${formatCurrency(monthlyPI)}</span>`;
    html += '</div>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Home Insurance:</span>';
    html += `<span class="detail-value">${formatCurrency(loanData.annualHomeInsurance / 12)}</span>`;
    html += '</div>';
    html += '<div class="detail-row">';
    html += '<span class="detail-label">Property Taxes:</span>';
    html += `<span class="detail-value">${formatCurrency(loanData.annualPropertyTax / 12)}</span>`;
    html += '</div>';
    html += '<div class="detail-row" style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">';
    html += '<span class="detail-label"><strong>Total PITI:</strong></span>';
    html += `<span class="detail-value" style="font-size: 18px; color: #2563eb;"><strong>${formatCurrency(totalPITI)}</strong></span>`;
    html += '</div>';
    html += '</div>';
    
    // Savings (if applicable)
    if (savings > 0) {
      html += '<div>';
      html += '<h3 class="detail-section">Monthly Savings</h3>';
      html += '<div class="detail-row">';
      html += '<span class="detail-label">vs Current Payment:</span>';
      html += `<span class="monthly-savings" style="font-size: 18px;"><strong>+${formatCurrency(savings)}</strong></span>`;
      html += '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';

    return html;
  };

  const generateSummaryHTML = (): string => {
    let html = '<div class="section">';
    html += '<h2 class="section-title">Summary</h2>';
    html += '<div class="summary-grid">';
    
    html += '<div class="summary-item">';
    html += '<div class="summary-label">Loan Amount</div>';
    html += `<div class="summary-value">${formatCurrency(getLoanAmount(loanData))}</div>`;
    html += '</div>';
    
    html += '<div class="summary-item">';
    html += '<div class="summary-label">Total Monthly Debts</div>';
    html += `<div class="summary-value">${formatCurrency(totalSelectedMonthlyDebts(loanData.debts))}</div>`;
    html += '</div>';
    
    html += '<div class="summary-item">';
    html += '<div class="summary-label">Gross Monthly Income</div>';
    html += `<div class="summary-value">${formatCurrency(loanData.grossMonthlyIncome)}</div>`;
    html += '</div>';
    
    if (totalRefinancedDebts(loanData.debts) > 0) {
      html += '<div class="summary-item" style="border-left-color: #10b981;">';
      html += '<div class="summary-label">Total Refinanced Debt</div>';
      html += `<div class="summary-value">${formatCurrency(totalRefinancedDebts(loanData.debts))}</div>`;
      html += '</div>';
      
      html += '<div class="summary-item" style="border-left-color: #059669;">';
      html += '<div class="summary-label">Monthly Savings from Refinanced Debts</div>';
      html += `<div class="summary-value monthly-savings">${formatCurrency(totalRefinancedMonthlyPayments(loanData.debts))}</div>`;
      html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    return html;
  };

  const generateExecutiveSummaryHTML = (): string => {
    if (!preferredProgram) return '';
    
    const effectiveRate = preferredProgram.buyDown ? preferredProgram.effectiveRate : preferredProgram.rate;
    const totalPITI = calculateTotalPITI(preferredProgram, loanData);
    const savings = preferredProgram.previousMonthlyPITI ? preferredProgram.previousMonthlyPITI - totalPITI : 0;
    
    // Calculate break-even for buy-down
    let breakEvenText = '';
    if (preferredProgram.buyDown && preferredProgram.buyDownCost > 0) {
      const loanAmount = preferredProgram.overrideLoanAmount || getLoanAmount(loanData);
      const originalPayment = calculateMonthlyPayment(loanAmount, preferredProgram.rate, preferredProgram.term);
      const buyDownPayment = calculateMonthlyPayment(loanAmount, effectiveRate, preferredProgram.term);
      const monthlySavings = originalPayment - buyDownPayment;
      const breakEvenMonths = monthlySavings > 0 ? Math.ceil(preferredProgram.buyDownCost / monthlySavings) : 0;
      const breakEvenYears = Math.floor(breakEvenMonths / 12);
      const remainingMonths = breakEvenMonths % 12;
      breakEvenText = `${breakEvenYears > 0 ? `${breakEvenYears} years ` : ''}${remainingMonths} months`;
    }

    let html = '<div class="section" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">';
    html += '<h2 class="section-title" style="color: white; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 12px;">📋 Executive Summary</h2>';
    
    html += '<div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">';
    
    // Best Option
    html += '<div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; backdrop-filter: blur(10px);">';
    html += '<h3 style="margin: 0 0 8px 0; color: #fbbf24;">🏆 Recommended Option</h3>';
    html += `<p style="margin: 0; font-size: 16px; font-weight: 600;">${preferredProgram.name}</p>`;
    html += `<p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Monthly Payment: ${formatCurrency(totalPITI)}</p>`;
    html += '</div>';
    
    // Monthly Savings
    if (savings > 0) {
      html += '<div style="background: rgba(16, 185, 129, 0.2); padding: 16px; border-radius: 8px; backdrop-filter: blur(10px);">';
      html += '<h3 style="margin: 0 0 8px 0; color: #10b981;">💰 Monthly Savings</h3>';
      html += `<p style="margin: 0; font-size: 20px; font-weight: 700;">+${formatCurrency(savings)}</p>`;
      html += '<p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">vs. current payment</p>';
      html += '</div>';
    }
    
    // Break-even Analysis
    if (breakEvenText) {
      html += '<div style="background: rgba(139, 92, 246, 0.2); padding: 16px; border-radius: 8px; backdrop-filter: blur(10px);">';
      html += '<h3 style="margin: 0 0 8px 0; color: #8b5cf6;">⏱️ Buy-Down Break-Even</h3>';
      html += `<p style="margin: 0; font-size: 16px; font-weight: 600;">${breakEvenText}</p>`;
      html += '<p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">to recover buy-down cost</p>';
      html += '</div>';
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
  };

  const generateNextStepsHTML = (): string => {
    let html = '<div class="section" style="background: #fef3c7; border-left: 4px solid #f59e0b;">';
    html += '<h2 class="section-title" style="color: #92400e;">📝 Next Steps</h2>';
    
    html += '<div class="grid">';
    
    // Required Documents
    html += '<div>';
    html += '<h3 style="color: #92400e; margin-bottom: 12px;">📄 Required Documents</h3>';
    html += '<ul style="margin: 0; padding-left: 20px; color: #92400e;">';
    html += '<li>Recent pay stubs (last 2 months)</li>';
    html += '<li>Tax returns (last 2 years)</li>';
    html += '<li>Bank statements (last 2 months)</li>';
    html += '<li>Employment verification letter</li>';
    html += '<li>Asset documentation</li>';
    html += '</ul>';
    html += '</div>';
    
    // Timeline
    html += '<div>';
    html += '<h3 style="color: #92400e; margin-bottom: 12px;">⏰ Typical Timeline</h3>';
    html += '<ul style="margin: 0; padding-left: 20px; color: #92400e;">';
    html += '<li><strong>Application:</strong> 1-2 days</li>';
    html += '<li><strong>Processing:</strong> 2-3 weeks</li>';
    html += '<li><strong>Underwriting:</strong> 1-2 weeks</li>';
    html += '<li><strong>Closing:</strong> 30-45 days total</li>';
    html += '</ul>';
    html += '</div>';
    
    // Action Items
    html += '<div>';
    html += '<h3 style="color: #92400e; margin-bottom: 12px;">✅ Immediate Actions</h3>';
    html += '<ul style="margin: 0; padding-left: 20px; color: #92400e;">';
    html += '<li>Lock in your interest rate (expires in 30-60 days)</li>';
    html += '<li>Gather required documentation</li>';
    html += '<li>Schedule home appraisal</li>';
    html += '<li>Review loan terms and conditions</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    
    return html;
  };

  const generateTotalCostAnalysisHTML = (): string => {
    let html = '<div class="section">';
    html += '<h2 class="section-title">💵 Total Cost Analysis</h2>';
    
    html += '<div class="table-container">';
    html += '<table>';
    html += '<thead><tr>';
    html += '<th>Cost Component</th>';
    
    selectedPrograms.forEach(program => {
      const isPreferred = preferredProgramId === program.id;
      html += `<th class="center ${isPreferred ? 'preferred-header' : ''}">${program.name}`;
      if (isPreferred) {
        html += '<div class="recommended-badge">Recommended</div>';
      }
      html += '</th>';
    });
    html += '</tr></thead><tbody>';
    
    // Calculate costs for each program
    const costMetrics = [
      {
        key: 'Buy-Down Cost (Upfront)',
        getValue: (program: Program) => program.buyDownCost > 0 ? formatCurrency(program.buyDownCost) : 'N/A'
      },
      {
        key: 'Total Interest (30 years)',
        getValue: (program: Program) => {
          const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
          const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
          const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
          const totalPayments = monthlyPI * (program.term * 12);
          const totalInterest = totalPayments - loanAmount;
          return formatCurrency(totalInterest);
        }
      },
      {
        key: 'Total Cost of Loan',
        getValue: (program: Program) => {
          const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
          const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
          const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
          const totalPayments = monthlyPI * (program.term * 12);
          const totalCost = totalPayments + (program.buyDownCost || 0);
          return formatCurrency(totalCost);
        }
      }
    ];
    
    costMetrics.forEach(metric => {
      html += `<tr><td style="font-weight: 500;">${metric.key}</td>`;
      selectedPrograms.forEach(program => {
        const isPreferred = preferredProgramId === program.id;
        const cellClass = isPreferred ? 'center preferred-cell' : 'center';
        html += `<td class="${cellClass}">${metric.getValue(program)}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    html += '</div>';
    
    return html;
  };

  const generateFullHTML = (): string => {
    let html = '<html><head>';
    html += '<meta charset="UTF-8">';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    html += '<title>Loan Comparison Analysis</title>';
    html += '<style>';
    html += `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #374151;
        background-color: #f9fafb;
        margin: 0;
        padding: 20px;
      }
      .container { max-width: 1200px; margin: 0 auto; }
      .section { 
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        padding: 24px;
        margin-bottom: 24px;
      }
      .section-title { 
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .preferred-section {
        background: linear-gradient(to right, #f0fdf4, #eff6ff);
        border-left: 4px solid #10b981;
      }
      .preferred-title {
        color: #10b981;
      }
      .star { color: #10b981; }
      .table-container { overflow-x: auto; }
      table { 
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #d1d5db;
      }
      th, td { 
        border: 1px solid #d1d5db;
        padding: 12px 16px;
      }
      th { 
        background-color: #f9fafb;
        font-weight: 600;
        text-align: left;
      }
      th.center, td.center { text-align: center; }
      .preferred-header { 
        background-color: #dcfce7 !important;
        font-weight: bold;
      }
      .preferred-cell { background-color: #f0fdf4; }
      .recommended-badge {
        font-size: 12px;
        color: #059669;
        font-weight: normal;
        margin-top: 4px;
      }
      .grid { 
        display: grid;
        gap: 24px;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
      .detail-section {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      .detail-label { color: #6b7280; }
      .detail-value { font-weight: 500; }
      .strikethrough { text-decoration: line-through; color: #9ca3af; }
      .rate-reduction { color: #10b981; }
      .monthly-savings { color: #059669; font-weight: 600; }
      .buydown-cost { color: #dc2626; }
      .break-even { color: #7c3aed; }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }
      .summary-item {
        background: #f8fafc;
        padding: 12px;
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
      }
      .summary-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .summary-value {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      .disclaimer {
        margin-top: 32px;
        padding: 16px;
        background: #fef3c7;
        border-radius: 6px;
        border-left: 4px solid #f59e0b;
        font-style: italic;
        color: #92400e;
      }
    `;
    html += '</style></head><body>';
    html += '<div class="container">';
    html += '<h1 style="text-align: center; color: #1f2937; margin-bottom: 32px;">Loan Comparison Analysis</h1>';
    
    // Generate sections in the user-defined order
    sectionOrder.forEach(section => {
      if (!section.enabled) return;
      
      switch (section.id) {
        case 'executiveSummary':
          html += generateExecutiveSummaryHTML();
          break;
        case 'summary':
          html += generateSummaryHTML();
          break;
        case 'comparisonTable':
          html += generateComparisonTableHTML();
          break;
        case 'totalCostAnalysis':
          html += generateTotalCostAnalysisHTML();
          break;
        case 'buydownAnalysis':
          html += generateBuydownAnalysisHTML();
          break;
        case 'recommendation':
          html += generateRecommendationHTML();
          break;
        case 'nextSteps':
          html += generateNextStepsHTML();
          break;
      }
    });
    
    html += '<div class="disclaimer">Rates are not final and are subject to change pending final underwriting approval.</div>';
    html += '</div></body></html>';
    
    return html;
  };

  const copyTableToClipboard = async () => {
    const htmlContent = generateFullHTML();
    
    try {
      await navigator.clipboard.writeText(htmlContent);
      alert('Content copied to clipboard as HTML!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy to clipboard');
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Export sections in the user-defined order
    sectionOrder.forEach((section, index) => {
      if (!section.enabled) return;
      
      let worksheetData: any[][] = [];
      let sheetName = section.name;
      
      switch (section.id) {
        case 'executiveSummary':
          if (preferredProgram) {
            const effectiveRate = preferredProgram.buyDown ? preferredProgram.effectiveRate : preferredProgram.rate;
            const totalPITI = calculateTotalPITI(preferredProgram, loanData);
            const savings = preferredProgram.previousMonthlyPITI ? preferredProgram.previousMonthlyPITI - totalPITI : 0;
            
            worksheetData = [
              ['Executive Summary'],
              [''],
              ['Recommended Option', preferredProgram.name],
              ['Monthly Payment', formatCurrency(totalPITI)],
              savings > 0 ? ['Monthly Savings', formatCurrency(savings)] : ['', ''],
            ].filter(row => row[0] !== '');
          }
          break;
          
        case 'summary':
          worksheetData = [
            ['Summary Information'],
            [''],
            ['Loan Amount', formatCurrency(getLoanAmount(loanData))],
            ['Total Monthly Debts', formatCurrency(totalSelectedMonthlyDebts(loanData.debts))],
            ['Gross Monthly Income', formatCurrency(loanData.grossMonthlyIncome)]
          ];
          if (totalRefinancedDebts(loanData.debts) > 0) {
            worksheetData.push(['Total Refinanced Debt', formatCurrency(totalRefinancedDebts(loanData.debts))]);
            worksheetData.push(['Monthly Savings from Refinanced Debts', formatCurrency(totalRefinancedMonthlyPayments(loanData.debts))]);
          }
          break;
          
        case 'comparisonTable':
          const headers = ['Metric', ...selectedPrograms.map(p => p.name)];
          worksheetData = [['Loan Comparison Results'], [''], headers];
          
          const metrics = [
            { key: 'Program Type', getValue: (program: Program) => program.type.charAt(0).toUpperCase() + program.type.slice(1) },
            { key: 'Term', getValue: (program: Program) => `${program.term} years` },
            { 
              key: 'Interest Rate', 
              getValue: (program: Program) => {
                if (program.buyDown && program.effectiveRate !== program.rate) {
                  return `${formatPercent(program.rate)} → ${formatPercent(program.effectiveRate)}`;
                }
                return formatPercent(program.rate);
              }
            },
            { key: 'Loan Amount', getValue: (program: Program) => formatCurrency(program.overrideLoanAmount || getLoanAmount(loanData)) },
            { 
              key: 'Monthly P&I', 
              getValue: (program: Program) => {
                const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
                return formatCurrency(calculateMonthlyPayment(program.overrideLoanAmount || getLoanAmount(loanData), effectiveRate, program.term));
              }
            },
            { key: 'Total Monthly Payment (PITI)', getValue: (program: Program) => formatCurrency(calculateTotalPITI(program, loanData)) }
          ];
          
          metrics.forEach(metric => {
            const row = [metric.key, ...selectedPrograms.map(program => metric.getValue(program))];
            worksheetData.push(row);
          });
          break;
          
        case 'totalCostAnalysis':
          const costHeaders = ['Cost Component', ...selectedPrograms.map(p => p.name)];
          worksheetData = [['Total Cost Analysis'], [''], costHeaders];
          
          const costMetrics = [
            {
              key: 'Buy-Down Cost (Upfront)',
              getValue: (program: Program) => program.buyDownCost > 0 ? formatCurrency(program.buyDownCost) : 'N/A'
            },
            {
              key: 'Total Interest (30 years)',
              getValue: (program: Program) => {
                const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
                const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
                const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
                const totalPayments = monthlyPI * (program.term * 12);
                const totalInterest = totalPayments - loanAmount;
                return formatCurrency(totalInterest);
              }
            },
            {
              key: 'Total Cost of Loan',
              getValue: (program: Program) => {
                const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
                const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
                const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
                const totalPayments = monthlyPI * (program.term * 12);
                const totalCost = totalPayments + (program.buyDownCost || 0);
                return formatCurrency(totalCost);
              }
            }
          ];
          
          costMetrics.forEach(metric => {
            const row = [metric.key, ...selectedPrograms.map(program => metric.getValue(program))];
            worksheetData.push(row);
          });
          break;
          
        case 'buydownAnalysis':
          const buydownPrograms = selectedPrograms.filter(program => program.buyDown && program.buyDownCost > 0);
          if (buydownPrograms.length > 0) {
            worksheetData = [
              ['Buy-Down Break-Even Analysis'],
              [''],
              ['Program', 'Buy-Down Cost', 'Monthly Savings', 'Break-Even Period', 'Rate Reduction']
            ];
            
            buydownPrograms.forEach(program => {
              const effectiveRate = program.effectiveRate || program.rate;
              const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
              const originalPayment = calculateMonthlyPayment(loanAmount, program.rate, program.term);
              const buyDownPayment = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
              const monthlySavings = originalPayment - buyDownPayment;
              const breakEvenMonths = monthlySavings > 0 ? Math.ceil(program.buyDownCost / monthlySavings) : 0;
              const breakEvenYears = Math.floor(breakEvenMonths / 12);
              const remainingMonths = breakEvenMonths % 12;
              const breakEvenText = `${breakEvenYears > 0 ? `${breakEvenYears}y ` : ''}${remainingMonths}m`;
              
              worksheetData.push([
                program.name,
                formatCurrency(program.buyDownCost),
                formatCurrency(monthlySavings),
                breakEvenText,
                `${(program.rate - effectiveRate).toFixed(3)}%`
              ]);
            });
          }
          break;
          
        case 'recommendation':
          if (preferredProgram) {
            const effectiveRate = preferredProgram.buyDown ? preferredProgram.effectiveRate : preferredProgram.rate;
            const loanAmount = preferredProgram.overrideLoanAmount || getLoanAmount(loanData);
            const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, preferredProgram.term);
            const totalPITI = calculateTotalPITI(preferredProgram, loanData);
            
            worksheetData = [
              ['Preferred Recommendation'],
              [''],
              ['Program Name', preferredProgram.name],
              ['Program Type', preferredProgram.type.charAt(0).toUpperCase() + preferredProgram.type.slice(1)],
              ['Term', `${preferredProgram.term} years`],
              ['Interest Rate', preferredProgram.buyDown && preferredProgram.effectiveRate !== preferredProgram.rate 
                ? `${formatPercent(preferredProgram.rate)} → ${formatPercent(preferredProgram.effectiveRate)}`
                : formatPercent(preferredProgram.rate)],
              ['Loan Amount', formatCurrency(loanAmount)],
              ['Monthly P&I', formatCurrency(monthlyPI)],
              ['Total PITI', formatCurrency(totalPITI)]
            ];
          }
          break;
          
        case 'nextSteps':
          worksheetData = [
            ['Next Steps & Action Items'],
            [''],
            ['Required Documents'],
            ['- Recent pay stubs (last 2 months)'],
            ['- Tax returns (last 2 years)'],
            ['- Bank statements (last 2 months)'],
            ['- Employment verification letter'],
            ['- Asset documentation'],
            [''],
            ['Typical Timeline'],
            ['- Application: 1-2 days'],
            ['- Processing: 2-3 weeks'],
            ['- Underwriting: 1-2 weeks'],
            ['- Closing: 30-45 days total'],
            [''],
            ['Immediate Actions'],
            ['- Lock in your interest rate (expires in 30-60 days)'],
            ['- Gather required documentation'],
            ['- Schedule home appraisal'],
            ['- Review loan terms and conditions']
          ];
          break;
      }
      
      if (worksheetData.length > 0) {
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        // Limit sheet name to 31 characters (Excel limit)
        const limitedSheetName = sheetName.length > 31 ? sheetName.substring(0, 28) + '...' : sheetName;
        XLSX.utils.book_append_sheet(workbook, worksheet, limitedSheetName);
      }
    });
    
    XLSX.writeFile(workbook, 'loan-comparison-analysis.xlsx');
  };

  const exportToOutlookEML = () => {
    const subject = 'Loan Comparison Analysis';
    const body = generateFullHTML();
    
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

  if (selectedPrograms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Export Options</h2>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
        >
          <Settings size={14} />
          Customize Export
        </button>
      </div>

      {showOptions && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium mb-3">Select and reorder sections to include:</h3>
          <div className="space-y-2">
            {sectionOrder.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-2 bg-white rounded border cursor-move hover:bg-gray-50 transition-colors ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <GripVertical size={16} className="text-gray-400" />
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={() => handleSectionChange(section.id)}
                  className="cursor-pointer"
                />
                <span className="text-sm flex-1">{section.name}</span>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Drag sections to reorder them in the export
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowPreview(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 transition-colors"
          title="Preview export before copying or downloading"
        >
          <Eye size={16} />
          Preview Export
        </button>
        <button
          onClick={copyTableToClipboard}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 transition-colors"
          title="Copy selected sections as HTML to clipboard"
        >
          <Copy size={16} />
          Copy to Clipboard
        </button>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
          title="Export selected sections to Excel file"
        >
          <FileDown size={16} />
          Export to Excel
        </button>
        <button
          onClick={exportToOutlookEML}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
          title="Export selected sections as Outlook email"
        >
          <FileText size={16} />
          Draft Outlook Email
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Export Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: generateFullHTML().replace('<html><body>', '').replace('</body></html>', '') 
                }}
              />
            </div>
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Sections: {sectionOrder.filter(s => s.enabled).map(s => s.name).join(', ')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    copyTableToClipboard();
                    setShowPreview(false);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center gap-1"
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  onClick={() => {
                    exportToExcel();
                    setShowPreview(false);
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                >
                  <FileDown size={14} />
                  Excel
                </button>
                <button
                  onClick={() => {
                    exportToOutlookEML();
                    setShowPreview(false);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                >
                  <FileText size={14} />
                  Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions;
