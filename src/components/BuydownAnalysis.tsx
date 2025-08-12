import React from 'react';
import { Program, LoanData } from '../types';
import { 
  calculateMonthlyPayment, 
  formatCurrency, 
  formatPercent,
  getLoanAmount
} from '../utils/calculations';

interface BuydownAnalysisProps {
  loanData: LoanData;
  selectedPrograms: Program[];
}

const BuydownAnalysis: React.FC<BuydownAnalysisProps> = ({
  loanData,
  selectedPrograms
}) => {
  const buydownPrograms = selectedPrograms.filter(program => program.buyDown && program.buyDownCost > 0);

  if (buydownPrograms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Buy-Down Break-Even Analysis</h2>
      <div className="space-y-4">
        {buydownPrograms.map(program => {
          const effectiveRate = program.effectiveRate || program.rate;
          const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
          const originalPayment = calculateMonthlyPayment(loanAmount, program.rate, program.term);
          const buyDownPayment = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
          const monthlySavings = originalPayment - buyDownPayment;
          const breakEvenMonths = monthlySavings > 0 ? Math.ceil(program.buyDownCost / monthlySavings) : 0;
          const breakEvenYears = Math.floor(breakEvenMonths / 12);
          const remainingMonths = breakEvenMonths % 12;

          return (
            <div key={program.id} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-800">{program.name}</h3>
                <div className="text-sm text-gray-600">
                  {formatPercent(program.rate)} → {formatPercent(effectiveRate)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-md shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Buy-Down Cost</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(program.buyDownCost)}
                  </div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-md shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Monthly Savings</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(monthlySavings)}
                  </div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-md shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Break-Even Period</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {breakEvenYears > 0 ? `${breakEvenYears}y ` : ''}{remainingMonths}m
                  </div>
                  <div className="text-xs text-gray-500">({breakEvenMonths} months)</div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-md shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Rate Reduction</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {(program.rate - effectiveRate).toFixed(3)}%
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Original Payment (P&I):</span>
                  <span className="font-medium">{formatCurrency(originalPayment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Buy-Down Payment (P&I):</span>
                  <span className="font-medium text-green-600">{formatCurrency(buyDownPayment)}</span>
                </div>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Analysis:</strong> {breakEvenMonths <= 60 ? 
                  `This buy-down pays for itself in ${breakEvenYears > 0 ? `${breakEvenYears} years and ` : ''}${remainingMonths} months, making it a potentially good investment.` :
                  `Break-even period of ${Math.round(breakEvenMonths/12)} years is relatively long. Consider your long-term plans.`
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BuydownAnalysis;
