/**
 * Extensible Financial Tools Application
 * Main entry point that demonstrates the new extensibility pattern
 */

import React, { useEffect, useState } from 'react';
import { ToolManager } from './core/components/ToolManager';
import { ToolRegistry } from './core/registry/ToolRegistry';
import { LoanComparisonTool } from './tools/LoanComparisonTool';
import { ClientManagementTool } from './tools/ClientManagementTool';

// Import the original loan comparison component for backward compatibility
import LoanComparisonToolOriginal from './LoanComparisonTool';

interface ExtensibleAppProps {
  mode?: 'extensible' | 'legacy';
}

export const ExtensibleApp: React.FC<ExtensibleAppProps> = ({ mode = 'extensible' }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTools = async () => {
      try {
        const registry = ToolRegistry.getInstance();

        // Register loan comparison tool
        const loanTool = new LoanComparisonTool();
        
        const loanRegistered = registry.registerTool(loanTool, {
          enableAutoSave: true,
          autoSaveInterval: 30000,
          enableExport: true,
          enableImport: true,
          supportedImportFormats: ['json', 'csv', 'xlsx', 'eml'],
          supportedExportFormats: ['json', 'csv', 'xlsx', 'pdf']
        });

        if (!loanRegistered) {
          throw new Error('Failed to register Loan Comparison Tool');
        }

        // Log registry statistics
        const stats = registry.getStats();
        console.log('Tool Registry initialized:', stats);

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize tools:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    if (mode === 'extensible') {
      initializeTools();
    } else {
      setIsInitialized(true);
    }
  }, [mode]);

  // Legacy mode - render original loan comparison tool
  if (mode === 'legacy') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-yellow-800 font-medium">Legacy Mode</h3>
                <p className="text-yellow-700 text-sm">
                  You're using the original loan comparison tool. 
                  Switch to extensible mode to access the new platform features.
                </p>
              </div>
            </div>
          </div>
          <LoanComparisonToolOriginal />
        </div>
      </div>
    );
  }

  // Extensible mode - render tool manager
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {initError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <h3 className="text-red-800 font-medium mb-2">Initialization Error</h3>
              <p className="text-red-700 text-sm mb-4">{initError}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-gray-700 font-medium mb-2">Initializing Financial Tools Platform</h3>
              <p className="text-gray-500 text-sm">Loading tools and setting up the registry...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4">
        {/* Platform Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Financial Tools Platform</h1>
              <p className="text-blue-100">
                Extensible platform for financial analysis and planning tools
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">Version 2.0.0</div>
              <div className="text-blue-200 text-xs">Extensible Architecture</div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🔧</span>
              <h3 className="font-medium text-gray-800">Extensible</h3>
            </div>
            <p className="text-sm text-gray-600">
              Easy to add new financial tools and calculators
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🔄</span>
              <h3 className="font-medium text-gray-800">Interoperable</h3>
            </div>
            <p className="text-sm text-gray-600">
              Tools can share data and work together seamlessly
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">💾</span>
              <h3 className="font-medium text-gray-800">Persistent</h3>
            </div>
            <p className="text-sm text-gray-600">
              Auto-save, import/export, and scenario management
            </p>
          </div>
        </div>

        {/* Tool Manager */}
        <ToolManager className="mb-6" />

        {/* Developer Information */}
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <h4 className="font-medium text-gray-700 mb-2">For Developers</h4>
          <p className="text-sm text-gray-600 mb-2">
            This platform uses a plugin-based architecture. To add new tools:
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <div>1. Extend <code className="bg-gray-200 px-1 rounded">BaseTool</code> class</div>
            <div>2. Implement required methods (<code className="bg-gray-200 px-1 rounded">calculate</code>, <code className="bg-gray-200 px-1 rounded">validateData</code>)</div>
            <div>3. Register with <code className="bg-gray-200 px-1 rounded">ToolRegistry</code></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensibleApp;
