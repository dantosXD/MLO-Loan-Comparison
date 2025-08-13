import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X, Settings, Users, Calculator, Plus, Info } from 'lucide-react';
import { LoanData, Program, ProgramDebtSelection } from '../types';
import { calculateDTIForProgram, calculateMonthlyPayment, formatCurrency, getLoanAmount } from '../utils/calculations';
import DebtSelectionModal from './DebtSelectionModal';

interface LoanProgramsProps {
  loanData: LoanData;
  preferredProgramId: number | null;
  onUpdateProgram: (id: number, updates: Partial<Program>) => void;
  onAddProgram: () => void;
  onRemoveProgram: (id: number) => void;
  onUpdateLoanData: (updates: Partial<LoanData>) => void;
  onMoveProgram: (id: number, direction: 'up' | 'down') => void;
  onSetPreferredProgram: (id: number) => void;
}

const LoanPrograms: React.FC<LoanProgramsProps> = ({
  loanData,
  preferredProgramId,
  onUpdateProgram,
  onAddProgram,
  onRemoveProgram,
  onUpdateLoanData,
  onMoveProgram,
  onSetPreferredProgram
}) => {
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  // Add safety checks for loanData and programs
  if (!loanData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Loan Programs</h2>
        <p className="text-gray-500">Loading loan data...</p>
      </div>
    );
  }

  const programs = loanData.programs || [];
  const debts = loanData.debts || [];
  const programDebtSelections = loanData.programDebtSelections || [];

  // Helper functions
  const openDebtModal = (program: Program) => {
    setSelectedProgram(program);
    setDebtModalOpen(true);
  };

  const handleDebtSelectionSave = (selection: ProgramDebtSelection) => {
    const updatedSelections = programDebtSelections.filter(s => s.programId !== selection.programId);
    updatedSelections.push(selection);
    onUpdateLoanData({ programDebtSelections: updatedSelections });
  };

  const getDebtSelectionForProgram = (programId: number): ProgramDebtSelection | undefined => {
    return programDebtSelections.find(selection => selection.programId === programId);
  };

  const calculateProgramDTI = (program: Program): any => {
    const programDebtSelection = getDebtSelectionForProgram(program.id);
    
    if (programDebtSelection) {
      // Use program-specific debt calculation
      const housingPayment = calculateMonthlyPayment(
        program.overrideLoanAmount || getLoanAmount(loanData),
        program.effectiveRate || program.rate,
        program.term
      ) + (loanData.annualPropertyTax / 12) + (loanData.annualHomeInsurance / 12);

      const totalMonthlyObligations = housingPayment + programDebtSelection.totalMonthlyDebt;
      const housingDTI = loanData.grossMonthlyIncome > 0 ? (housingPayment / loanData.grossMonthlyIncome) * 100 : 0;
      const totalDTI = loanData.grossMonthlyIncome > 0 ? (totalMonthlyObligations / loanData.grossMonthlyIncome) * 100 : 0;

      return {
        totalDTI,
        housingDTI,
        totalMonthlyObligations,
        housingPayment,
        debtPayments: programDebtSelection.totalMonthlyDebt
      };
    }

    // Fallback to original calculation
    return calculateDTIForProgram(loanData, program);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-700">Loan Programs</h2>
          <div className="group relative">
            <Info size={16} className="text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Add and configure loan programs for comparison
            </div>
          </div>
        </div>
        <button
          onClick={onAddProgram}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} />
          Add Program
        </button>
      </div>

      <div className="space-y-6">
        {programs.map((program, index) => {
          const programDebtSelection = getDebtSelectionForProgram(program.id);
          const programDTI = calculateProgramDTI(program);
          const selectedDebtCount = programDebtSelection ? programDebtSelection.selectedDebtIds.length : debts.filter(d => d.includeInDTI).length;
          
          return (
            <div key={program.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="checkbox"
                  checked={program.selected}
                  onChange={(e) => onUpdateProgram(program.id, { selected: e.target.checked })}
                />
                <input
                  type="text"
                  value={program.name}
                  onChange={(e) => onUpdateProgram(program.id, { name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                
                {/* Debt Selection Button */}
                <button
                  onClick={() => openDebtModal(program)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                  title="Configure debt selection for this program"
                >
                  <Users size={16} />
                  <span className="text-sm font-medium">{selectedDebtCount} Debts</span>
                  {programDebtSelection && (
                    <span className="text-xs bg-purple-200 px-2 py-1 rounded-full">
                      {formatCurrency(programDebtSelection.totalMonthlyDebt)}/mo
                    </span>
                  )}
                </button>
                
                <input
                  type="radio"
                  name="preferred"
                  checked={preferredProgramId === program.id}
                  onChange={() => onSetPreferredProgram(program.id)}
                />
                <span className="text-sm text-gray-600">Preferred</span>
                
                {/* Move buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => onMoveProgram(program.id, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => onMoveProgram(program.id, 'down')}
                    disabled={index === programs.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                
                <button
                  onClick={() => onRemoveProgram(program.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={program.rate}
                    onChange={(e) => onUpdateProgram(program.id, { rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term (years)</label>
                <input
                  type="number"
                  value={program.term}
                  onChange={(e) => onUpdateProgram(program.id, { term: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly P&I</label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                  {formatCurrency(calculateMonthlyPayment(
                    program.overrideLoanAmount || getLoanAmount(loanData), 
                    program.buyDown ? program.effectiveRate : program.rate, 
                    program.term
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DTI (%)</label>
                <div className={`px-3 py-2 border border-gray-300 rounded-md ${
                  programDebtSelection ? 'bg-purple-50 border-purple-200' : 'bg-gray-100'
                }`}>
                  <div className="font-medium">{programDTI.totalDTI.toFixed(1)}%</div>
                  {programDebtSelection && (
                    <div className="text-xs text-purple-600 mt-1">
                      Custom debt selection
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rate Buy-Down Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={program.buyDown}
                    onChange={(e) => onUpdateProgram(program.id, { 
                      buyDown: e.target.checked,
                      effectiveRate: e.target.checked ? program.rate : program.rate
                    })}
                  />
                  <span className="text-sm font-medium text-gray-700">Rate Buy-Down: Enable</span>
                </label>
              </div>
              
              {program.buyDown && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Buy-Down Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={program.buyDownCost || ''}
                      onChange={(e) => onUpdateProgram(program.id, { buyDownCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Effective Rate (%)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={program.effectiveRate || program.rate}
                      onChange={(e) => {
                        const newEffectiveRate = parseFloat(e.target.value) || program.rate;
                        onUpdateProgram(program.id, { 
                          effectiveRate: newEffectiveRate,
                          rateReduction: program.rate - newEffectiveRate
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Reduction</label>
                    <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700">
                      {program.effectiveRate && program.effectiveRate < program.rate 
                        ? `${(program.rate - program.effectiveRate).toFixed(3)}%`
                        : '0.000%'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        })}
      </div>

      {/* Debt Selection Modal */}
      {selectedProgram && (
        <DebtSelectionModal
          isOpen={debtModalOpen}
          onClose={() => setDebtModalOpen(false)}
          program={selectedProgram}
          debts={debts}
          currentSelection={getDebtSelectionForProgram(selectedProgram.id)}
          allPrograms={programs}
          allSelections={programDebtSelections}
          onSave={handleDebtSelectionSave}
        />
      )}
    </div>
  );
};

export default LoanPrograms;
