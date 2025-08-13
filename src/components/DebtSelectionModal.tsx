import React, { useState, useEffect } from 'react';
import { X, Check, Copy, Trash2, Users, Calculator } from 'lucide-react';
import { Debt, Program, ProgramDebtSelection } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DebtSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: Program;
  debts: Debt[];
  currentSelection?: ProgramDebtSelection;
  allPrograms: Program[];
  allSelections: ProgramDebtSelection[];
  onSave: (selection: ProgramDebtSelection) => void;
}

const DebtSelectionModal: React.FC<DebtSelectionModalProps> = ({
  isOpen,
  onClose,
  program,
  debts,
  currentSelection,
  allPrograms,
  allSelections,
  onSave
}) => {
  const [selectedDebtIds, setSelectedDebtIds] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Initialize selected debts
  useEffect(() => {
    if (currentSelection) {
      setSelectedDebtIds(currentSelection.selectedDebtIds);
    } else {
      // Default: select all debts that are included in DTI
      setSelectedDebtIds(debts.filter(debt => debt.includeInDTI).map(debt => debt.id));
    }
  }, [currentSelection, debts]);

  // Calculate totals
  const selectedDebts = debts.filter(debt => selectedDebtIds.includes(debt.id));
  const totalMonthlyDebt = selectedDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  const totalBalance = selectedDebts.reduce((sum, debt) => sum + debt.balance, 0);

  const toggleDebt = (debtId: number) => {
    setSelectedDebtIds(prev => 
      prev.includes(debtId) 
        ? prev.filter(id => id !== debtId)
        : [...prev, debtId]
    );
  };

  const selectAll = () => {
    setSelectedDebtIds(debts.filter(debt => debt.includeInDTI).map(debt => debt.id));
  };

  const clearAll = () => {
    setSelectedDebtIds([]);
  };

  const copyFromProgram = (sourceProgramId: number) => {
    const sourceSelection = allSelections.find(sel => sel.programId === sourceProgramId);
    if (sourceSelection) {
      setSelectedDebtIds(sourceSelection.selectedDebtIds);
    }
  };

  const handleSave = () => {
    const selection: ProgramDebtSelection = {
      programId: program.id,
      selectedDebtIds,
      totalMonthlyDebt,
      lastUpdated: new Date().toISOString()
    };
    onSave(selection);
    onClose();
  };

  if (!isOpen) return null;

  const availableDebts = debts.filter(debt => debt.includeInDTI);
  const otherProgramsWithSelections = allPrograms.filter(p => 
    p.id !== program.id && allSelections.some(sel => sel.programId === p.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configure Debts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select which debts to include for <span className="font-medium">{program.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">{selectedDebts.length}</div>
                <div className="text-sm text-blue-600">Selected Debts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalMonthlyDebt)}</div>
                <div className="text-sm text-blue-600">Monthly Payment</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalBalance)}</div>
                <div className="text-sm text-blue-600">Total Balance</div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="mb-6">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
            >
              <Users size={16} />
              Bulk Actions
            </button>
            
            {showBulkActions && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    Clear All
                  </button>
                </div>
                
                {otherProgramsWithSelections.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Copy selection from:</p>
                    <div className="flex flex-wrap gap-2">
                      {otherProgramsWithSelections.map(otherProgram => (
                        <button
                          key={otherProgram.id}
                          onClick={() => copyFromProgram(otherProgram.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          <Copy size={12} />
                          {otherProgram.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Debt List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Available Debts</h3>
            {availableDebts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No debts available for DTI calculation. Add debts in the Monthly Debts section.
              </p>
            ) : (
              availableDebts.map(debt => (
                <div
                  key={debt.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedDebtIds.includes(debt.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleDebt(debt.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDebtIds.includes(debt.id)}
                        onChange={() => toggleDebt(debt.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{debt.creditor}</div>
                        <div className="text-sm text-gray-600">
                          Balance: {formatCurrency(debt.balance)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(debt.monthlyPayment)}/mo
                      </div>
                      {debt.willBeRefinanced && (
                        <div className="text-xs text-orange-600">Will be refinanced</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedDebts.length} of {availableDebts.length} debts selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Check size={16} />
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtSelectionModal;
