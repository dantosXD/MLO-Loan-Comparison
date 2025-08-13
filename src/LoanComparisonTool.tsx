import React, { useState, useEffect } from 'react';
import { LoanData, Program, Debt, SavedScenario } from './types';
import { 
  calculateDTIForProgram,
  getLoanAmount,
  formatCurrency
} from './utils/calculations';
import { DebtManagement, ScenarioManagement, LoanPrograms, ComparisonResults, RecommendationSummary, BuydownAnalysis, ExportOptions } from './components';
import ErrorBoundary from './components/ErrorBoundary';
import { storageManager } from './utils/storageManager';

// LoanParameters component (keeping inline for now)
interface LoanParametersProps {
  loanData: LoanData;
  handleLoanDataChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  formatCurrency: (value: number) => string;
}

const LoanParameters: React.FC<LoanParametersProps> = ({ loanData, handleLoanDataChange, formatCurrency }) => {
  return (
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
  );
};

const LoanComparisonTool = () => {
  // State management
  const [loanData, setLoanData] = useState<LoanData>({
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
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');

  // Load saved scenarios on mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const scenarios = await storageManager.getScenarios();
        // Convert new format to existing format for compatibility
        const convertedScenarios = scenarios.map(s => ({
          id: s.name, // Use name as ID for now
          name: s.name,
          version: '1.0', // Add required version field
          loanData: s.loanData,
          preferredProgramId: null, // Will be enhanced later
          createdAt: s.createdAt
        }));
        setSavedScenarios(convertedScenarios);
      } catch (error) {
        console.error('Failed to load saved scenarios:', error);
      }
    };
    loadScenarios();
  }, []);

  // Helper functions
  const handleLoanDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLoanData(prev => ({
      ...prev,
      [name]: name.includes('Price') || name.includes('Payment') || name.includes('Amount') || name.includes('Tax') || name.includes('Insurance') || name.includes('Income')
        ? parseFloat(value) || 0
        : value
    }));
  };

  const getSelectedPrograms = (): Program[] => {
    return loanData.programs.filter(program => program.selected);
  };

  const getPreferredProgram = (): Program | null => {
    return preferredProgramId ? loanData.programs.find(p => p.id === preferredProgramId) || null : null;
  };

  // Program management functions
  const addProgram = () => {
    const newId = Math.max(...loanData.programs.map(p => p.id), 0) + 1;
    const newProgram: Program = {
      id: newId,
      type: 'conventional',
      rate: 7.0,
      term: 30,
      selected: false,
      name: `Program ${newId}`,
      buyDown: false,
      buyDownCost: 0,
      effectiveRate: 7.0
    };
    setLoanData(prev => ({ ...prev, programs: [...prev.programs, newProgram] }));
  };

  const removeProgram = (id: number) => {
    setLoanData(prev => ({ ...prev, programs: prev.programs.filter(p => p.id !== id) }));
    if (preferredProgramId === id) {
      setPreferredProgramId(null);
    }
  };

  const updateProgram = (id: number, updates: Partial<Program>) => {
    setLoanData(prev => ({
      ...prev,
      programs: prev.programs.map(p => p.id === id ? { ...p, ...updates } : p)
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
    
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: scenarioName,
      version: '1.0',
      createdAt: new Date().toISOString(),
      loanData,
      preferredProgramId
    };

    try {
      await storageManager.saveScenario(scenarioName, loanData);
      const updatedScenarios = [...savedScenarios, scenario];
      setSavedScenarios(updatedScenarios);
      setScenarioName('');
    } catch (error) {
      console.error('Failed to save scenario:', error);
      alert('Failed to save scenario. Please try again.');
    }
  };

  const loadScenario = (scenario: SavedScenario) => {
    setLoanData(scenario.loanData);
    setPreferredProgramId(scenario.preferredProgramId || null);
  };

  const deleteScenario = async (id: string) => {
    try {
      await storageManager.deleteScenario(id);
      const updatedScenarios = savedScenarios.filter(s => s.id !== id);
      setSavedScenarios(updatedScenarios);
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    }
  };

  const handleImportScenario = (data: any) => {
    try {
      if (data && data.loanData) {
        // Validate that loanData has the required structure
        const loanData = data.loanData;
        
        // Ensure programs array exists and has valid structure
        if (!Array.isArray(loanData.programs)) {
          loanData.programs = [];
        }
        
        // Ensure debts array exists
        if (!Array.isArray(loanData.debts)) {
          loanData.debts = [];
        }
        
        // Set the imported data
        setLoanData(loanData);
        setPreferredProgramId(data.preferredProgramId || null);
        
        // Show success message
        alert(`Successfully imported scenario with ${loanData.programs.length} programs and ${loanData.debts.length} debts.`);
      } else {
        throw new Error('Invalid data structure: missing loanData');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Failed to import scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Loan Comparison Tool
        </h1>

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
        <LoanParameters
          loanData={loanData}
          handleLoanDataChange={handleLoanDataChange}
          formatCurrency={formatCurrency}
        />

        {/* Debt Management */}
        <DebtManagement
          loanData={loanData}
          onUpdateLoanData={(updates) => setLoanData(prev => ({ ...prev, ...updates }))}
        />

        {/* Loan Programs */}
        <ErrorBoundary>
          <LoanPrograms
            loanData={loanData}
            preferredProgramId={preferredProgramId}
            onUpdateProgram={updateProgram}
            onAddProgram={addProgram}
            onRemoveProgram={removeProgram}
            onMoveProgram={moveProgram}
            onSetPreferredProgram={setPreferredProgramId}
            onUpdateLoanData={(updates) => setLoanData(prev => ({ ...prev, ...updates }))}
          />
        </ErrorBoundary>

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

export default LoanComparisonTool;
