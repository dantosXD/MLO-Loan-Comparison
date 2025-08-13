import React, { useState } from 'react';
import { Upload, FileText, X, Plus, Info } from 'lucide-react';
import { Debt, LoanData } from '../types';
import { parseDebtsPaste, parseDebtFileImport } from '../utils/importUtils';
import { formatCurrency, totalSelectedMonthlyDebts, totalRefinancedDebts, totalRefinancedMonthlyPayments } from '../utils/calculations';

interface DebtManagementProps {
  loanData: LoanData;
  onUpdateLoanData: (updates: Partial<LoanData>) => void;
}

const DebtManagement: React.FC<DebtManagementProps> = ({ loanData, onUpdateLoanData }) => {
  const [showDebtImport, setShowDebtImport] = useState(false);
  const [debtPasteText, setDebtPasteText] = useState('');

  const addDebt = () => {
    const newId = Math.max(...loanData.debts.map(d => d.id), 0) + 1;
    const newDebt: Debt = {
      id: newId,
      creditor: '',
      balance: 0,
      monthlyPayment: 0,
      includeInDTI: true,
      willBeRefinanced: false
    };
    onUpdateLoanData({ debts: [...loanData.debts, newDebt] });
  };

  const removeDebt = (id: number) => {
    onUpdateLoanData({ debts: loanData.debts.filter(d => d.id !== id) });
  };

  const updateDebt = (id: number, updates: Partial<Debt>) => {
    onUpdateLoanData({
      debts: loanData.debts.map(d => d.id === id ? { ...d, ...updates } : d)
    });
  };

  const handleDebtPaste = () => {
    if (!debtPasteText.trim()) {
      alert('Please paste debt data first.');
      return;
    }
    
    try {
      const newDebts = parseDebtsPaste(debtPasteText, loanData.debts);
      if (newDebts.length > 0) {
        onUpdateLoanData({ debts: [...loanData.debts, ...newDebts] });
        setDebtPasteText('');
        setShowDebtImport(false);
        alert(`Successfully imported ${newDebts.length} debt(s).`);
      } else {
        alert('No valid debt data found. Please check the format.');
      }
    } catch (error) {
      console.error('Paste import error:', error);
      alert('Failed to parse pasted data. Please check the format.');
    }
  };

  const handleDebtFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedExtensions = ['json', 'csv', 'xlsx', 'xls'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert('Please select a supported file type: JSON, CSV, XLSX, or XLS.');
      event.target.value = '';
      return;
    }

    try {
      const result = await parseDebtFileImport(file, loanData.debts);
      if (result.success && result.debts) {
        onUpdateLoanData({ debts: [...loanData.debts, ...result.debts] });
        setShowDebtImport(false);
        alert(`Successfully imported ${result.debts.length} debt(s) from ${file.name}.`);
      } else {
        console.error('File import error:', result.error);
        alert(`Import failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('File reading error:', error);
      alert('Failed to read the file. Please ensure it\'s a valid file.');
    }
    
    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-700">Monthly Debts</h2>
          <div className="group relative">
            <Info size={16} className="text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Add monthly debt obligations for DTI calculation
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDebtImport(!showDebtImport)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Import
          </button>
          <button
            onClick={addDebt}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center gap-1"
          >
            <Plus size={14} />
            Add Debt
          </button>
        </div>
      </div>

      {showDebtImport && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium mb-3">Import Debts</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-2">
                <strong>Paste Data:</strong> Supports JSON, CSV, tab-separated, comma-separated, or pipe-separated data
              </label>
              <textarea
                value={debtPasteText}
                onChange={(e) => setDebtPasteText(e.target.value)}
                placeholder={`Examples:\n\nJSON: [{"creditor":"Credit Card","balance":5000,"monthlyPayment":150}]\n\nCSV: Credit Card,5000,150\n\nTab-separated: Credit Card\t5000\t150`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono"
                rows={4}
              />
              <div className="mt-2 text-xs text-gray-500">
                <strong>Format:</strong> Creditor, Balance, Monthly Payment, Include in DTI (optional), Will be Refinanced (optional)
              </div>
              <button
                onClick={handleDebtPaste}
                disabled={!debtPasteText.trim()}
                className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                Import from Paste
              </button>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600"><strong>Or upload file:</strong></span>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 cursor-pointer">
                  <FileText size={14} />
                  JSON File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleDebtFileUpload}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer">
                  <FileText size={14} />
                  CSV File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleDebtFileUpload}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 cursor-pointer">
                  <FileText size={14} />
                  Excel File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleDebtFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <strong>Supported formats:</strong> JSON (.json), CSV (.csv), Excel (.xlsx, .xls)
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loanData.debts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No debts added yet.</p>
        ) : (
          <>
            {loanData.debts.map((debt) => (
              <div key={debt.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
                <input
                  type="text"
                  placeholder="Creditor name"
                  value={debt.creditor}
                  onChange={(e) => updateDebt(debt.id, { creditor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Balance"
                  value={debt.balance || ''}
                  onChange={(e) => updateDebt(debt.id, { balance: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="number"
                  placeholder="Monthly payment"
                  value={debt.monthlyPayment || ''}
                  onChange={(e) => updateDebt(debt.id, { monthlyPayment: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={debt.includeInDTI}
                    onChange={(e) => updateDebt(debt.id, { includeInDTI: e.target.checked })}
                  />
                  <span className="text-sm">Include in DTI</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={debt.willBeRefinanced}
                    onChange={(e) => updateDebt(debt.id, { willBeRefinanced: e.target.checked })}
                  />
                  <span className="text-sm">Will be refinanced</span>
                </label>
                <button
                  onClick={() => removeDebt(debt.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            
            {/* Debt Summary */}
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Monthly Debts (DTI):</span>
                  <div className="text-lg font-semibold text-blue-700">
                    {formatCurrency(totalSelectedMonthlyDebts(loanData.debts))}
                  </div>
                </div>
                {totalRefinancedDebts(loanData.debts) > 0 && (
                  <>
                    <div>
                      <span className="font-medium">Total Refinanced Debt:</span>
                      <div className="text-lg font-semibold text-green-700">
                        {formatCurrency(totalRefinancedDebts(loanData.debts))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Monthly Savings from Refinanced:</span>
                      <div className="text-lg font-semibold text-green-700">
                        {formatCurrency(totalRefinancedMonthlyPayments(loanData.debts))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DebtManagement;
