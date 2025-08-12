import React from 'react';
import { Program, LoanData } from '../types';
import { 
  calculateMonthlyPayment, 
  calculateTotalPITI, 
  formatCurrency, 
  formatPercent,
  getLoanAmount
} from '../utils/calculations';

interface RecommendationSummaryProps {
  loanData: LoanData;
  preferredProgram: Program | null;
}

const RecommendationSummary: React.FC<RecommendationSummaryProps> = ({
  loanData,
  preferredProgram
}) => {
  if (!preferredProgram) {
    return null;
  }

  const effectiveRate = preferredProgram.buyDown ? preferredProgram.effectiveRate : preferredProgram.rate;
  const loanAmount = preferredProgram.overrideLoanAmount || getLoanAmount(loanData);
  const monthlyPI = calculateMonthlyPayment(loanAmount, effectiveRate, preferredProgram.term);
  const totalPITI = calculateTotalPITI(preferredProgram, loanData);
  const savings = preferredProgram.previousMonthlyPITI ? preferredProgram.previousMonthlyPITI - totalPITI : 0;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-md p-6 mb-6 border-l-4 border-green-500">
      <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span className="text-green-600">★</span>
        Preferred Recommendation: {preferredProgram.name}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-1">Program Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Program Type:</span>
              <span className="font-medium">{preferredProgram.type.charAt(0).toUpperCase() + preferredProgram.type.slice(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Term:</span>
              <span className="font-medium">{preferredProgram.term} years</span>
            </div>
            <div className="flex justify-between">
              <span>Interest Rate:</span>
              <span className="font-medium">
                {preferredProgram.buyDown && preferredProgram.effectiveRate !== preferredProgram.rate ? (
                  <span>
                    <span className="line-through text-gray-500">{formatPercent(preferredProgram.rate)}</span>
                    {' → '}
                    <span className="text-green-600">{formatPercent(preferredProgram.effectiveRate)}</span>
                  </span>
                ) : (
                  formatPercent(preferredProgram.rate)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Loan Amount:</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-1">Monthly Payments</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Principal & Interest:</span>
              <span className="font-medium">{formatCurrency(monthlyPI)}</span>
            </div>
            <div className="flex justify-between">
              <span>Property Taxes:</span>
              <span className="font-medium">{formatCurrency(loanData.annualPropertyTax / 12)}</span>
            </div>
            <div className="flex justify-between">
              <span>Home Insurance:</span>
              <span className="font-medium">{formatCurrency(loanData.annualHomeInsurance / 12)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
              <span>Total PITI:</span>
              <span className="text-blue-600">{formatCurrency(totalPITI)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-1">Analysis</h3>
          <div className="space-y-2 text-sm">
            {preferredProgram.buyDown && preferredProgram.buyDownCost > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Buy-Down Cost:</span>
                  <span className="font-medium">{formatCurrency(preferredProgram.buyDownCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Reduction:</span>
                  <span className="font-medium text-green-600">
                    {(preferredProgram.rate - preferredProgram.effectiveRate).toFixed(3)}%
                  </span>
                </div>
              </>
            )}
            {savings !== 0 && (
              <div className="flex justify-between">
                <span>Monthly Savings:</span>
                <span className={`font-medium ${savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {savings > 0 ? '+' : ''}{formatCurrency(savings)}
                </span>
              </div>
            )}
            {preferredProgram.buyDown && preferredProgram.buyDownCost > 0 && (
              <div className="flex justify-between">
                <span>Break-even Period:</span>
                <span className="font-medium">
                  {(() => {
                    const originalPayment = calculateMonthlyPayment(loanAmount, preferredProgram.rate, preferredProgram.term);
                    const buyDownPayment = calculateMonthlyPayment(loanAmount, effectiveRate, preferredProgram.term);
                    const monthlySavings = originalPayment - buyDownPayment;
                    const breakEvenMonths = monthlySavings > 0 ? Math.ceil(preferredProgram.buyDownCost / monthlySavings) : 0;
                    return `${breakEvenMonths} months`;
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-white bg-opacity-50 rounded-lg">
        <p className="text-sm text-gray-600 italic">
          <strong>Disclaimer:</strong> This analysis is based on the information provided and current market conditions. 
          Actual rates and terms are subject to final underwriting approval and may vary based on credit profile, 
          property appraisal, and other factors. Please consult with your loan officer for final rate confirmation.
        </p>
      </div>
    </div>
  );
};

export default RecommendationSummary;
