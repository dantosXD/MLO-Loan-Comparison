/**
 * Enhanced Debt Management Component
 * Supports both quick total debt input and detailed debt tracking
 * with per-program debt selection capabilities
 */

import React, { useState, useEffect } from 'react';
import { DebtItem, DebtManagementState, ProgramDebtSelection, DebtCalculationResult } from '../types/debt';
import { Program } from '../types';
import { Plus, Edit, Trash2, DollarSign, CreditCard, Car, GraduationCap, User, FileText } from 'lucide-react';

interface EnhancedDebtManagementProps {
  state: DebtManagementState;
  programs: Program[];
  onStateChange: (state: DebtManagementState) => void;
  onDebtCalculationChange: (programId: number, result: DebtCalculationResult) => void;
}

export const EnhancedDebtManagement: React.FC<EnhancedDebtManagementProps> = ({
  state,
  programs,
  onStateChange,
  onDebtCalculationChange
}) => {
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [showAddDebtForm, setShowAddDebtForm] = useState(false);

  const getCategoryIcon = (category: string) => {
    const icons = {
      credit_card: CreditCard,
      auto_loan: Car,
      student_loan: GraduationCap,
      personal_loan: User,
      other: FileText
    };
    return icons[category as keyof typeof icons] || FileText;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      credit_card: 'bg-red-100 text-red-700',
      auto_loan: 'bg-blue-100 text-blue-700',
      student_loan: 'bg-green-100 text-green-700',
      personal_loan: 'bg-purple-100 text-purple-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const calculateDebtForProgram = (programId: number): DebtCalculationResult => {
    const selection = state.programDebtSelections.find(s => s.programId === programId);
    
    if (!selection || selection.useQuickTotal) {
      const totalMonthlyDebt = selection?.quickTotalOverride ?? state.quickTotalMonthlyDebt;
      return {
        totalMonthlyDebt,
        totalBalance: 0, // Unknown for quick total
        debtsByCategory: {},
        selectedDebts: []
      };
    }

    const selectedDebts = state.debts.filter(debt => 
      selection.selectedDebtIds.includes(debt.id) && debt.includeInDTI
    );

    const totalMonthlyDebt = selectedDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
    const totalBalance = selectedDebts.reduce((sum, debt) => sum + debt.balance, 0);

    const debtsByCategory = selectedDebts.reduce((acc, debt) => {
      if (!acc[debt.category]) {
        acc[debt.category] = { count: 0, monthlyPayment: 0, balance: 0 };
      }
      acc[debt.category].count++;
      acc[debt.category].monthlyPayment += debt.monthlyPayment;
      acc[debt.category].balance += debt.balance;
      return acc;
    }, {} as Record<string, { count: number; monthlyPayment: number; balance: number }>);

    return {
      totalMonthlyDebt,
      totalBalance,
      debtsByCategory,
      selectedDebts
    };
  };

  const updateState = (updates: Partial<DebtManagementState>) => {
    const newState = { ...state, ...updates };
    onStateChange(newState);
    
    // Recalculate debt for all programs
    programs.forEach(program => {
      const result = calculateDebtForProgram(program.id);
      onDebtCalculationChange(program.id, result);
    });
  };

  const addDebt = (debtData: Omit<DebtItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newDebt: DebtItem = {
      ...debtData,
      id: `debt_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateState({
      debts: [...state.debts, newDebt]
    });
    setShowAddDebtForm(false);
  };

  const updateDebt = (debtId: string, updates: Partial<DebtItem>) => {
    const updatedDebts = state.debts.map(debt =>
      debt.id === debtId 
        ? { ...debt, ...updates, updatedAt: new Date().toISOString() }
        : debt
    );
    
    updateState({ debts: updatedDebts });
    setEditingDebt(null);
  };

  const removeDebt = (debtId: string) => {
    const updatedDebts = state.debts.filter(debt => debt.id !== debtId);
    const updatedSelections = state.programDebtSelections.map(selection => ({
      ...selection,
      selectedDebtIds: selection.selectedDebtIds.filter(id => id !== debtId)
    }));
    
    updateState({
      debts: updatedDebts,
      programDebtSelections: updatedSelections
    });
  };

  const openDebtSelectionModal = (programId: number) => {
    updateState({
      activeModal: { type: 'debt-selection', programId }
    });
  };

  const closeModal = () => {
    updateState({ activeModal: null });
  };

  const updateProgramDebtSelection = (programId: number, updates: Partial<ProgramDebtSelection>) => {
    const existingIndex = state.programDebtSelections.findIndex(s => s.programId === programId);
    let updatedSelections;

    if (existingIndex >= 0) {
      updatedSelections = state.programDebtSelections.map((selection, index) =>
        index === existingIndex ? { ...selection, ...updates } : selection
      );
    } else {
      const newSelection: ProgramDebtSelection = {
        programId,
        selectedDebtIds: [],
        useQuickTotal: true,
        ...updates
      };
      updatedSelections = [...state.programDebtSelections, newSelection];
    }

    updateState({ programDebtSelections: updatedSelections });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Debt Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => updateState({ showDetailedDebts: !state.showDetailedDebts })}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              state.showDetailedDebts 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {state.showDetailedDebts ? 'Simple View' : 'Detailed View'}
          </button>
        </div>
      </div>

      {/* Quick Total Debt Input */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={state.useQuickTotal}
              onChange={() => updateState({ useQuickTotal: true })}
            />
            <span className="font-medium text-gray-700">Quick Total Monthly Debt</span>
          </label>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="number"
              value={state.quickTotalMonthlyDebt || ''}
              onChange={(e) => updateState({ quickTotalMonthlyDebt: Number(e.target.value) || 0 })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-48"
              placeholder="0"
              disabled={!state.useQuickTotal}
            />
          </div>
          <span className="text-sm text-gray-500">
            Use this for quick DTI calculations without detailed debt tracking
          </span>
        </div>
      </div>

      {/* Detailed Debt Management */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!state.useQuickTotal}
              onChange={() => updateState({ useQuickTotal: false })}
            />
            <span className="font-medium text-gray-700">Detailed Debt Tracking</span>
          </label>
          {!state.useQuickTotal && (
            <button
              onClick={() => setShowAddDebtForm(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              <Plus className="w-4 h-4" />
              Add Debt
            </button>
          )}
        </div>

        {!state.useQuickTotal && (
          <div className="space-y-3">
            {state.debts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No debts added yet</p>
                <p className="text-sm">Add debts to track detailed DTI calculations</p>
              </div>
            ) : (
              state.debts.map((debt) => {
                const IconComponent = getCategoryIcon(debt.category);
                return (
                  <div key={debt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="font-medium text-gray-800">{debt.name}</div>
                          <div className="text-sm text-gray-500">{debt.creditor}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(debt.category)}`}>
                          {debt.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">${debt.monthlyPayment.toLocaleString()}/mo</div>
                          <div className="text-sm text-gray-500">${debt.balance.toLocaleString()} balance</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={debt.includeInDTI}
                              onChange={(e) => updateDebt(debt.id, { includeInDTI: e.target.checked })}
                            />
                            DTI
                          </label>
                          <button
                            onClick={() => setEditingDebt(debt)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeDebt(debt.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Per-Program Debt Selection */}
      {!state.useQuickTotal && state.debts.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="font-medium text-gray-700 mb-4">Per-Program Debt Selection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((program) => {
              const selection = state.programDebtSelections.find(s => s.programId === program.id);
              const calculation = calculateDebtForProgram(program.id);
              
              return (
                <div key={program.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-800">{program.name}</div>
                    <button
                      onClick={() => openDebtSelectionModal(program.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Select Debts
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Monthly Debt: ${calculation.totalMonthlyDebt.toLocaleString()}</div>
                    <div>Selected Debts: {calculation.selectedDebts.length}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Debt Selection Modal */}
      {state.activeModal?.type === 'debt-selection' && (
        <DebtSelectionModal
          programId={state.activeModal.programId}
          program={programs.find(p => p.id === state.activeModal!.programId)!}
          debts={state.debts}
          selection={state.programDebtSelections.find(s => s.programId === state.activeModal!.programId)}
          onSelectionChange={(updates) => updateProgramDebtSelection(state.activeModal!.programId, updates)}
          onClose={closeModal}
        />
      )}

      {/* Add/Edit Debt Forms would go here */}
      {showAddDebtForm && (
        <AddDebtForm
          onAdd={addDebt}
          onCancel={() => setShowAddDebtForm(false)}
        />
      )}

      {editingDebt && (
        <EditDebtForm
          debt={editingDebt}
          onUpdate={(updates) => updateDebt(editingDebt.id, updates)}
          onCancel={() => setEditingDebt(null)}
        />
      )}
    </div>
  );
};

// Debt Selection Modal Component
interface DebtSelectionModalProps {
  programId: number;
  program: Program;
  debts: DebtItem[];
  selection?: ProgramDebtSelection;
  onSelectionChange: (updates: Partial<ProgramDebtSelection>) => void;
  onClose: () => void;
}

const DebtSelectionModal: React.FC<DebtSelectionModalProps> = ({
  programId,
  program,
  debts,
  selection,
  onSelectionChange,
  onClose
}) => {
  const [useQuickTotal, setUseQuickTotal] = useState(selection?.useQuickTotal ?? true);
  const [quickTotal, setQuickTotal] = useState(selection?.quickTotalOverride ?? 0);
  const [selectedIds, setSelectedIds] = useState(selection?.selectedDebtIds ?? []);

  const handleSave = () => {
    onSelectionChange({
      useQuickTotal,
      quickTotalOverride: useQuickTotal ? quickTotal : undefined,
      selectedDebtIds: useQuickTotal ? [] : selectedIds
    });
    onClose();
  };

  const toggleDebtSelection = (debtId: string) => {
    setSelectedIds(prev => 
      prev.includes(debtId) 
        ? prev.filter(id => id !== debtId)
        : [...prev, debtId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Select Debts for {program.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Quick Total Option */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="radio"
                checked={useQuickTotal}
                onChange={() => setUseQuickTotal(true)}
              />
              <span className="font-medium">Use Quick Total for this Program</span>
            </label>
            {useQuickTotal && (
              <div className="ml-6">
                <input
                  type="number"
                  value={quickTotal || ''}
                  onChange={(e) => setQuickTotal(Number(e.target.value) || 0)}
                  className="px-3 py-2 border border-gray-300 rounded-md w-32"
                  placeholder="0"
                />
                <span className="ml-2 text-sm text-gray-500">per month</span>
              </div>
            )}
          </div>

          {/* Detailed Selection Option */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="radio"
                checked={!useQuickTotal}
                onChange={() => setUseQuickTotal(false)}
              />
              <span className="font-medium">Select Individual Debts</span>
            </label>
            {!useQuickTotal && (
              <div className="ml-6 space-y-2">
                {debts.filter(debt => debt.includeInDTI).map(debt => (
                  <label key={debt.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(debt.id)}
                      onChange={() => toggleDebtSelection(debt.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{debt.name}</div>
                      <div className="text-sm text-gray-500">
                        {debt.creditor} • ${debt.monthlyPayment}/mo
                      </div>
                    </div>
                  </label>
                ))}
                {debts.filter(debt => debt.includeInDTI).length === 0 && (
                  <p className="text-gray-500 text-sm">No debts available for DTI calculation</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for Add/Edit forms
const AddDebtForm: React.FC<{ onAdd: (debt: any) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-4">Add New Debt</h3>
      {/* Add form fields here */}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md">
          Cancel
        </button>
        <button onClick={() => onAdd({})} className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Add Debt
        </button>
      </div>
    </div>
  </div>
);

const EditDebtForm: React.FC<{ debt: DebtItem; onUpdate: (updates: any) => void; onCancel: () => void }> = ({ debt, onUpdate, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-4">Edit Debt</h3>
      {/* Add form fields here */}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md">
          Cancel
        </button>
        <button onClick={() => onUpdate({})} className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Update Debt
        </button>
      </div>
    </div>
  </div>
);
