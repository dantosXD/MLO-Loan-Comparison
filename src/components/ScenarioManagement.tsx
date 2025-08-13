import React, { useState } from 'react';
import { Save, Upload, Download, Trash2, FileText } from 'lucide-react';
import { LoanData, SavedScenario } from '../types';
import { parseJsonImport, parseJsonFileImport } from '../utils/importUtils';
import { exportScenarioToJson } from '../utils/exportUtils';

interface ScenarioManagementProps {
  loanData: LoanData;
  preferredProgramId: number | null;
  savedScenarios: SavedScenario[];
  scenarioName: string;
  onScenarioNameChange: (name: string) => void;
  onSaveScenario: () => void;
  onLoadScenario: (scenario: SavedScenario) => void;
  onDeleteScenario: (id: string) => void;
  onImportScenario: (data: any) => void;
}

const ScenarioManagement: React.FC<ScenarioManagementProps> = ({
  loanData,
  preferredProgramId,
  savedScenarios,
  scenarioName,
  onScenarioNameChange,
  onSaveScenario,
  onLoadScenario,
  onDeleteScenario,
  onImportScenario
}) => {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const handleJsonPaste = () => {
    if (!importText.trim()) {
      alert('Please paste JSON data first.');
      return;
    }
    
    const result = parseJsonImport(importText);
    if (result.success && result.data) {
      onImportScenario(result.data);
      setImportText('');
      setShowImport(false);
    } else {
      console.error('Import error:', result.error);
      alert(`Import failed: ${result.error || 'Unknown error'}`);
    }
  };

  const handleJsonFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Please select a JSON file (.json extension required).');
      event.target.value = '';
      return;
    }

    try {
      const result = await parseJsonFileImport(file);
      if (result.success && result.data) {
        onImportScenario(result.data);
        setShowImport(false);
      } else {
        console.error('File import error:', result.error);
        alert(`File import failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('File reading error:', error);
      alert('Failed to read the file. Please ensure it\'s a valid JSON file.');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleExportJson = () => {
    exportScenarioToJson(loanData, preferredProgramId);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Scenario Management</h2>
      
      {/* Save New Scenario */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Scenario name"
          value={scenarioName}
          onChange={(e) => onScenarioNameChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={onSaveScenario}
          disabled={!scenarioName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
        >
          <Save size={16} />
          Save
        </button>
      </div>

      {/* Import/Export */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowImport(!showImport)}
          className="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center gap-2"
        >
          <Upload size={16} />
          Import JSON
        </button>
        <button
          onClick={handleExportJson}
          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 flex items-center gap-2"
        >
          <Download size={16} />
          Export JSON
        </button>
      </div>

      {/* Import Section */}
      {showImport && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium mb-2">Import Scenario</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Paste JSON data:
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste exported JSON here..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                rows={4}
              />
              <button
                onClick={handleJsonPaste}
                disabled={!importText.trim()}
                className="mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
              >
                Import from Paste
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Or upload file:</span>
              <label className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer">
                <FileText size={14} />
                Choose JSON File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Saved Scenarios</h3>
          <div className="space-y-2">
            {savedScenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(scenario.createdAt).toLocaleDateString()} • 
                    {scenario.loanData.programs.length} programs • 
                    {scenario.loanData.debts.length} debts
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadScenario(scenario)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteScenario(scenario.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioManagement;
