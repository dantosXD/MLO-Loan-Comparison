/**
 * Enhanced Loan Comparison Component
 * Integrates the new debt management system with the existing loan comparison functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Save, 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  FileText, 
  AlertCircle,
  User
} from 'lucide-react';
import { LoanData, Program } from '../types';
import DebtManagement from './DebtManagement';
import { LoanPrograms, ComparisonResults, RecommendationSummary, BuydownAnalysis, ExportOptions, ScenarioManagement } from './index';
import ErrorBoundary from './ErrorBoundary';
import { calculateDTIForProgram, getLoanAmount } from '../utils/calculations';
import { storageManager } from '../utils/storageManager';

interface EnhancedLoanComparisonProps {
  className?: string;
  initialData?: any;
  onSave?: (loanData: any) => void;
  showSaveToClient?: boolean;
  clientName?: string;
}

export const EnhancedLoanComparison: React.FC<EnhancedLoanComparisonProps> = ({ className = '', initialData, onSave, showSaveToClient, clientName }) => {
  // Core loan data state
  const [loanData, setLoanData] = useState<LoanData>(initialData || {
    loanType: 'purchase',
    purchasePrice: 0,
    downPayment: 0,
    downPaymentPercent: 20,
    refinanceAmount: 0,
    refinanceLoanAmount: 0,
    hoi: 0,
    propertyTaxes: 0,
    annualPropertyTax: 0,
    annualHomeInsurance: 0,
    grossMonthlyIncome: 0,
    programs: [],
    debts: [],
    programDebtSelections: []
  });

  const [preferredProgramId, setPreferredProgramId] = useState<number | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);

  useEffect(() => {
    // Load saved scenarios
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const scenarios = await storageManager.getScenarios();
      setSavedScenarios(scenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    }
  };

  const handleLoanDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const numericValue = type === 'number' ? parseFloat(value) || 0 : value;
    
    setLoanData(prev => ({
      ...prev,
      [name]: numericValue
    }));
  };



  // Program management functions
  const addProgram = () => {
    const newProgram: Program = {
      id: Date.now(),
      type: 'conventional',
      rate: 7.0,
      term: 30,
      selected: true,
      name: `Program ${loanData.programs.length + 1}`,
      buyDown: false,
      buyDownCost: 0,
      effectiveRate: 7.0
    };

    setLoanData(prev => ({
      ...prev,
      programs: [...prev.programs, newProgram]
    }));
  };

  const removeProgram = (id: number) => {
    setLoanData(prev => ({
      ...prev,
      programs: prev.programs.filter(p => p.id !== id)
    }));

    // Clear preferred program if it was the removed one
    if (preferredProgramId === id) {
      setPreferredProgramId(null);
    }

    // Remove from program debt selections
    setLoanData(prev => ({
      ...prev,
      programDebtSelections: prev.programDebtSelections.filter(selection => selection.programId !== id)
    }));
  };

  const updateProgram = (id: number, updates: Partial<Program>) => {
    setLoanData(prev => ({
      ...prev,
      programs: prev.programs.map(program => 
        program.id === id 
          ? { 
              ...program, 
              ...updates,
              effectiveRate: updates.buyDown && updates.rateReduction 
                ? (updates.rate || program.rate) - updates.rateReduction 
                : updates.rate || program.rate
            }
          : program
      )
    }));
  };

  const moveProgram = (id: number, direction: 'up' | 'down') => {
    const currentIndex = loanData.programs.findIndex(p => p.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= loanData.programs.length) return;

    const newPrograms = [...loanData.programs];
    [newPrograms[currentIndex], newPrograms[newIndex]] = [newPrograms[newIndex], newPrograms[currentIndex]];
    
    setLoanData(prev => ({ ...prev, programs: newPrograms }));
  };

  // Scenario management functions
  const saveScenario = async () => {
    if (!scenarioName.trim()) return;
    
    try {
      // Check if we have a client integration callback
      if (onSave) {
        onSave(loanData);
        return;
      }
      
      // For now, save only the loan data to maintain compatibility
      // TODO: Extend storage manager to support enhanced scenario data
      await storageManager.saveScenario(scenarioName, loanData);
      await loadScenarios();
      setScenarioName('');
    } catch (error) {
      console.error('Failed to save scenario:', error);
      alert('Failed to save scenario. Please try again.');
    }
  };

  const saveToClient = () => {
    if (onSave) {
      onSave(loanData);
    }
  };

  const loadScenario = (scenario: any) => {
    setLoanData(scenario.loanData);
    setPreferredProgramId(scenario.preferredProgramId || null);
    
    // Load program debt selections if available
    if (scenario.programDebtSelections) {
      setLoanData(prev => ({ ...prev, programDebtSelections: scenario.programDebtSelections }));
    }
  };

  const deleteScenario = async (id: string) => {
    try {
      await storageManager.deleteScenario(id);
      await loadScenarios();
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    }
  };

  const handleImportScenario = (data: any) => {
    if (data.loanData) {
      setLoanData(data.loanData);
      setPreferredProgramId(data.preferredProgramId || null);
      
      // Import program debt selections if available
      if (data.programDebtSelections) {
        setLoanData(prev => ({ ...prev, programDebtSelections: data.programDebtSelections }));
      }
    }
  };

  // Helper functions
  const getSelectedPrograms = (): Program[] => {
    return loanData.programs.filter(program => program.selected);
  };

  const getPreferredProgram = (): Program | null => {
    return loanData.programs.find(program => program.id === preferredProgramId) || null;
  };

  // Enhanced DTI calculation that uses program-specific debt selections
  const calculateEnhancedDTI = (program: Program): any => {
    const programDebtSelection = loanData.programDebtSelections.find(selection => selection.programId === program.id);
    
    if (programDebtSelection) {
      // Use program-specific debt calculation
      const housingPayment = calculateMonthlyPI(
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

  const calculateMonthlyPI = (loanAmount: number, rate: number, term: number): number => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;
    
    if (monthlyRate === 0) {
      return loanAmount / numPayments;
    }
    
    return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  };

  return (
    <div className={`p-4 bg-gray-50 min-h-screen font-sans ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Enhanced Loan Comparison Tool
          </h1>
          {clientName && (
            <div className="mt-2 flex items-center justify-center gap-2 text-lg text-blue-600">
              <User className="w-5 h-5" />
              <span>for {clientName}</span>
            </div>
          )}
        </div>

        {/* Scenario Management */}
        <ScenarioManagement
          loanData={loanData}
          preferredProgramId={preferredProgramId}
          savedScenarios={savedScenarios}
          scenarioName={scenarioName}
          onScenarioNameChange={setScenarioName}
          onSaveScenario={saveScenario}
          onLoadScenario={loadScenario}
          onDeleteScenario={deleteScenario}
          onImportScenario={handleImportScenario}
        />

        {/* Loan Parameters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Loan Parameters</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
              <select
                name="loanType"
                value={loanData.loanType}
                onChange={handleLoanDataChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="purchase">Purchase</option>
                <option value="refinance">Refinance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gross Monthly Income</label>
              <input
                type="number"
                name="grossMonthlyIncome"
                value={loanData.grossMonthlyIncome || ''}
                onChange={handleLoanDataChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0"
              />
            </div>
            {loanData.loanType === 'purchase' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={loanData.purchasePrice || ''}
                    onChange={handleLoanDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment</label>
                  <input
                    type="number"
                    name="downPayment"
                    value={loanData.downPayment || ''}
                    onChange={handleLoanDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refinance Loan Amount</label>
                <input
                  type="number"
                  name="refinanceLoanAmount"
                  value={loanData.refinanceLoanAmount || ''}
                  onChange={handleLoanDataChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Property Tax</label>
              <input
                type="number"
                name="annualPropertyTax"
                value={loanData.annualPropertyTax || ''}
                onChange={handleLoanDataChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Home Insurance</label>
              <input
                type="number"
                name="annualHomeInsurance"
                value={loanData.annualHomeInsurance || ''}
                onChange={handleLoanDataChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Debt Management */}
        <DebtManagement
          loanData={loanData}
          onUpdateLoanData={(updates) => setLoanData(prev => ({ ...prev, ...updates }))}
        />

        {/* Loan Programs */}
        <LoanPrograms
          loanData={loanData}
          preferredProgramId={preferredProgramId}
          onUpdateProgram={updateProgram}
          onAddProgram={addProgram}
          onRemoveProgram={removeProgram}
          onUpdateLoanData={(updates) => setLoanData(prev => ({ ...prev, ...updates }))}
          onMoveProgram={moveProgram}
          onSetPreferredProgram={setPreferredProgramId}
        />

        {/* Export Options */}
        <ExportOptions
          loanData={loanData}
          selectedPrograms={getSelectedPrograms()}
          preferredProgramId={preferredProgramId}
          preferredProgram={getPreferredProgram()}
        />

        {/* Comparison Results */}
        <ComparisonResults
          loanData={loanData}
          selectedPrograms={getSelectedPrograms()}
          preferredProgramId={preferredProgramId}
        />

        {/* Buy-Down Break-Even Analysis */}
        <BuydownAnalysis
          loanData={loanData}
          selectedPrograms={getSelectedPrograms()}
        />

        {/* Preferred Recommendation Summary */}
        <RecommendationSummary
          loanData={loanData}
          preferredProgram={getPreferredProgram()}
        />
      </div>
    </div>
  );
};
