/**
 * Integrated App - Main entry point for the integrated loan officer workstation
 * Combines client management with loan comparison for seamless workflow
 */

import React from 'react';
import { IntegratedLoanWorkstation } from './components/IntegratedLoanWorkstation';
import { ClientManagementTool } from './tools/ClientManagementTool';

const IntegratedApp: React.FC = () => {
  // Initialize the client management tool
  const clientTool = new ClientManagementTool();

  return (
    <div className="min-h-screen bg-gray-50">
      <IntegratedLoanWorkstation clientTool={clientTool} />
    </div>
  );
};

export default IntegratedApp;
