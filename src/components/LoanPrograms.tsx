import React from 'react';
import { Plus, X, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { Program, LoanData } from '../types';
import { calculateMonthlyPayment, calculateDTIForProgram, formatCurrency, getLoanAmount } from '../utils/calculations';

interface LoanProgramsProps {
  loanData: LoanData;
  preferredProgramId: number | null;
  onUpdateProgram: (id: number, updates: Partial<Program>) => void;
  onAddProgram: () => void;
  onRemoveProgram: (id: number) => void;
  onMoveProgram: (id: number, direction: 'up' | 'down') => void;
  onSetPreferredProgram: (id: number) => void;
}

const LoanPrograms: React.FC<LoanProgramsProps> = ({
  loanData,
  preferredProgramId,
  onUpdateProgram,
  onAddProgram,
  onRemoveProgram,
  onMoveProgram,
  onSetPreferredProgram
}) => {
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
        {loanData.programs.map((program, index) => (
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
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
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
                  disabled={index === loanData.programs.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              
              <button
                onClick={() => onRemoveProgram(program.id)}
                className="text-red-600 hover:text-red-800 ml-auto"
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
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md">
                  {calculateDTIForProgram(program, loanData).toFixed(1)}%
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
        ))}
      </div>
    </div>
  );
};

export default LoanPrograms;
