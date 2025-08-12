import React from 'react';
import Card from './common/Card';
import { LoanData } from '../LoanComparisonTool';

interface LoanParametersProps {
  loanData: LoanData;
  handleLoanDataChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  formatCurrency: (value: number) => string;
}

const LoanParameters: React.FC<LoanParametersProps> = ({ loanData, handleLoanDataChange, formatCurrency }) => {
  return (
    <Card title="Loan Parameters">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400">Loan Type</label>
          <select
            name="loanType"
            value={loanData.loanType}
            onChange={handleLoanDataChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
          >
            <option value="purchase">Purchase</option>
            <option value="refinance">Refinance</option>
          </select>
        </div>
        {loanData.loanType === 'purchase' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-400">Purchase Price</label>
              <input
                type="number"
                name="purchasePrice"
                value={loanData.purchasePrice}
                onChange={handleLoanDataChange}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">Down Payment (%)</label>
              <input
                type="number"
                name="downPaymentPercent"
                value={loanData.downPaymentPercent}
                onChange={handleLoanDataChange}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400">Down Payment Amount</label>
              <input
                type="text"
                readOnly
                value={formatCurrency((loanData.purchasePrice * loanData.downPaymentPercent) / 100)}
                className="mt-1 block w-full bg-gray-600 border-gray-500 rounded-md shadow-sm sm:text-sm text-gray-300"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-400">Refinance Loan Amount</label>
            <input
              type="number"
              name="refinanceLoanAmount"
              value={loanData.refinanceLoanAmount}
              onChange={handleLoanDataChange}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-400">Annual Property Tax</label>
          <input
            type="number"
            name="annualPropertyTax"
            value={loanData.annualPropertyTax}
            onChange={handleLoanDataChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Annual Home Insurance</label>
          <input
            type="number"
            name="annualHomeInsurance"
            value={loanData.annualHomeInsurance}
            onChange={handleLoanDataChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
          />
        </div>
      </div>
    </Card>
  );
};

export default LoanParameters;
