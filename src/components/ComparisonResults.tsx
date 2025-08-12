import React from 'react';
import { Program, LoanData } from '../types';
import { 
  calculateMonthlyPayment, 
  calculateTotalPITI, 
  formatCurrency, 
  formatPercent,
  getLoanAmount,
  totalSelectedMonthlyDebts,
  totalRefinancedDebts,
  totalRefinancedMonthlyPayments
} from '../utils/calculations';

interface ComparisonResultsProps {
  loanData: LoanData;
  selectedPrograms: Program[];
  preferredProgramId: number | null;
}

const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  loanData,
  selectedPrograms,
  preferredProgramId
}) => {
  if (selectedPrograms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Loan Comparison Results</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">Metric</th>
              {selectedPrograms.map(program => (
                <th key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-100 font-bold' : ''
                }`}>
                  {program.name}
                  {preferredProgramId === program.id && (
                    <div className="text-xs text-green-600 font-normal mt-1">Recommended</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Program Type</td>
              {selectedPrograms.map(program => (
                <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-50' : ''
                }`}>
                  {program.type.charAt(0).toUpperCase() + program.type.slice(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Term</td>
              {selectedPrograms.map(program => (
                <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-50' : ''
                }`}>
                  {program.term} years
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Interest Rate</td>
              {selectedPrograms.map(program => (
                <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-50' : ''
                }`}>
                  {program.buyDown && program.effectiveRate !== program.rate ? (
                    <div>
                      <span className="line-through text-gray-500">{formatPercent(program.rate)}</span>
                      <br />
                      <span className="text-green-600 font-semibold">{formatPercent(program.effectiveRate)}</span>
                    </div>
                  ) : (
                    formatPercent(program.rate)
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Loan Amount</td>
              {selectedPrograms.map(program => (
                <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-50' : ''
                }`}>
                  {formatCurrency(program.overrideLoanAmount || getLoanAmount(loanData))}
                </td>
              ))}
            </tr>
            {selectedPrograms.some(p => p.buyDown && p.buyDownCost > 0) && (
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Upfront Buy-Down Cost</td>
                {selectedPrograms.map(program => (
                  <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                    preferredProgramId === program.id ? 'bg-green-50' : ''
                  }`}>
                    {program.buyDown && program.buyDownCost > 0 ? formatCurrency(program.buyDownCost) : 'N/A'}
                  </td>
                ))}
              </tr>
            )}
            {selectedPrograms.some(p => p.buyDown && p.buyDownCost > 0) && (
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Buy-Down Analysis</td>
                {selectedPrograms.map(program => {
                  if (program.buyDown && program.buyDownCost > 0) {
                    const effectiveRate = program.effectiveRate || program.rate;
                    const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
                    const originalPayment = calculateMonthlyPayment(loanAmount, program.rate, program.term);
                    const buyDownPayment = calculateMonthlyPayment(loanAmount, effectiveRate, program.term);
                    const monthlySavings = originalPayment - buyDownPayment;
                    const breakEvenMonths = monthlySavings > 0 ? Math.ceil(program.buyDownCost / monthlySavings) : 0;
                    
                    return (
                      <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center text-sm ${
                        preferredProgramId === program.id ? 'bg-green-50' : ''
                      }`}>
                        <div>Monthly Savings: <span className="font-semibold text-green-600">{formatCurrency(monthlySavings)}</span></div>
                        <div>Break-even: <span className="font-semibold">{breakEvenMonths} months</span></div>
                      </td>
                    );
                  }
                  return (
                    <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                      preferredProgramId === program.id ? 'bg-green-50' : ''
                    }`}>
                      N/A
                    </td>
                  );
                })}
              </tr>
            )}
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Monthly P&I</td>
              {selectedPrograms.map(program => {
                const effectiveRate = program.buyDown ? program.effectiveRate : program.rate;
                const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
                return (
                  <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                    preferredProgramId === program.id ? 'bg-green-50' : ''
                  }`}>
                    {formatCurrency(calculateMonthlyPayment(loanAmount, effectiveRate, program.term))}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Homeowner's Insurance (HOI)</td>
              {selectedPrograms.map(program => (
                <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-50' : ''
                }`}>
                  {formatCurrency(loanData.annualHomeInsurance / 12)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Property Taxes</td>
              {selectedPrograms.map(program => (
                <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                  preferredProgramId === program.id ? 'bg-green-50' : ''
                }`}>
                  {formatCurrency(loanData.annualPropertyTax / 12)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2 font-medium">Mortgage Insurance (MI)</td>
              {selectedPrograms.map(program => {
                const loanAmount = program.overrideLoanAmount || getLoanAmount(loanData);
                const loanToValue = loanData.loanType === 'purchase' 
                  ? (loanAmount / loanData.purchasePrice) * 100 
                  : 80;
                const needsMI = program.type === 'conventional' && loanToValue > 80;
                const miRate = needsMI ? 0.005 : 0;
                const monthlyMI = needsMI ? (loanAmount * miRate) / 12 : 0;
                
                return (
                  <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                    preferredProgramId === program.id ? 'bg-green-50' : ''
                  }`}>
                    {needsMI ? formatCurrency(monthlyMI) : 'N/A'}
                  </td>
                );
              })}
            </tr>
            {selectedPrograms.some(p => p.previousMonthlyPITI) && (
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Monthly Savings vs Current</td>
                {selectedPrograms.map(program => {
                  const currentPITI = calculateTotalPITI(program, loanData);
                  const savings = program.previousMonthlyPITI ? program.previousMonthlyPITI - currentPITI : 0;
                  return (
                    <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center ${
                      preferredProgramId === program.id ? 'bg-green-50' : ''
                    }`}>
                      {program.previousMonthlyPITI ? (
                        <span className={savings > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                          {savings > 0 ? '+' : ''}{formatCurrency(savings)}
                        </span>
                      ) : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            )}
            <tr className="bg-blue-50">
              <td className="border border-gray-300 px-4 py-2 font-bold">Total Monthly Payment (PITI)</td>
              {selectedPrograms.map(program => {
                const totalPITI = calculateTotalPITI(program, loanData);
                return (
                  <td key={program.id} className={`border border-gray-300 px-4 py-2 text-center font-bold ${
                    preferredProgramId === program.id ? 'bg-green-100' : ''
                  }`}>
                    {formatCurrency(totalPITI)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Loan Amount:</strong> {formatCurrency(getLoanAmount(loanData))}</p>
        <p><strong>Total Monthly Debts:</strong> {formatCurrency(totalSelectedMonthlyDebts(loanData.debts))}</p>
        <p><strong>Gross Monthly Income:</strong> {formatCurrency(loanData.grossMonthlyIncome)}</p>
        {totalRefinancedDebts(loanData.debts) > 0 && (
          <>
            <p><strong>Total Refinanced Debt:</strong> {formatCurrency(totalRefinancedDebts(loanData.debts))}</p>
            <p><strong>Monthly Savings from Refinanced Debts:</strong> {formatCurrency(totalRefinancedMonthlyPayments(loanData.debts))}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ComparisonResults;
