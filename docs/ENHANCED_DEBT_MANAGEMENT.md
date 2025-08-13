# Enhanced Debt Management System

## Overview

The Enhanced Debt Management System is a comprehensive, extensible solution for managing debt calculations across different financial tools. Built using our plugin-based architecture, it provides both simple and detailed debt tracking with per-program customization capabilities.

## Features

### 🚀 **Dual Input Modes**
- **Quick Total Debt**: Simple field for fast DTI calculations
- **Detailed Debt Tracking**: Comprehensive individual debt management

### 🎯 **Per-Program Debt Selection**
- Each loan program can have different debt selections
- Modal interface for choosing which debts to include
- Override with quick total per program if needed
- Real-time calculations that update automatically

### 🔧 **Extensible Plugin Architecture**
- Reusable across different financial tools
- Event-driven updates and notifications
- Configurable settings and validation
- Import/export capabilities

### 📊 **Smart Categorization**
- Credit Cards, Auto Loans, Student Loans, Personal Loans, Other
- Visual icons and color coding
- Category-based breakdowns and analysis

## Architecture

### Core Components

#### 1. **DebtManagementPlugin** (`src/core/plugins/DebtManagementPlugin.ts`)
The central plugin that manages all debt-related operations:

```typescript
const debtPlugin = new DebtManagementPlugin({
  allowQuickTotal: true,
  allowDetailedDebts: true,
  allowPerProgramSelection: true,
  autoCalculateDTI: true
});
```

**Key Methods:**
- `addDebt()` - Add new debt items
- `updateDebt()` - Modify existing debts
- `removeDebt()` - Delete debts
- `calculateDebtForProgram()` - Calculate debt for specific loan programs
- `setProgramDebtSelection()` - Configure per-program debt selections

#### 2. **Enhanced Types** (`src/types/debt.ts`)
Comprehensive type definitions for debt management:

```typescript
interface DebtItem {
  id: string;
  name: string;
  creditor: string;
  balance: number;
  monthlyPayment: number;
  category: 'credit_card' | 'auto_loan' | 'student_loan' | 'personal_loan' | 'other';
  includeInDTI: boolean;
  willBeRefinanced: boolean;
  // ... additional properties
}

interface ProgramDebtSelection {
  programId: number;
  selectedDebtIds: string[];
  quickTotalOverride?: number;
  useQuickTotal: boolean;
}
```

#### 3. **Enhanced UI Component** (`src/components/EnhancedDebtManagement.tsx`)
React component providing the user interface:

- Toggle between simple and detailed views
- Add/edit/remove individual debts
- Per-program debt selection modal
- Real-time debt calculations and summaries

## Usage Examples

### Basic Setup

```typescript
import { DebtManagementPlugin } from '../core/plugins/DebtManagementPlugin';
import { EnhancedDebtManagement } from '../components/EnhancedDebtManagement';

// Initialize the plugin
const debtPlugin = new DebtManagementPlugin();

// Add debt items
debtPlugin.addDebt({
  name: 'Credit Card',
  creditor: 'Chase',
  balance: 5000,
  monthlyPayment: 150,
  category: 'credit_card',
  includeInDTI: true,
  willBeRefinanced: false
});

// Calculate debt for a specific program
const debtCalculation = debtPlugin.calculateDebtForProgram(programId);
console.log(`Total monthly debt: $${debtCalculation.totalMonthlyDebt}`);
```

### Per-Program Debt Selection

```typescript
// Set specific debts for a loan program
debtPlugin.setProgramDebtSelection(programId, {
  useQuickTotal: false,
  selectedDebtIds: ['debt_1', 'debt_3'] // Only include specific debts
});

// Or use quick total override
debtPlugin.setProgramDebtSelection(programId, {
  useQuickTotal: true,
  quickTotalOverride: 800 // Custom monthly debt amount
});
```

### Event Handling

```typescript
// Listen for debt changes
debtPlugin.on('debtAdded', (debt) => {
  console.log('New debt added:', debt.name);
});

debtPlugin.on('stateChanged', (newState) => {
  // Update UI or recalculate DTI
  updateDTICalculations();
});
```

## Integration with Loan Comparison Tool

The Enhanced Debt Management System is fully integrated with the loan comparison tool:

### 1. **Enhanced DTI Calculations**
- Uses debt plugin calculations for accurate DTI ratios
- Supports per-program debt selections
- Real-time updates when debts change

### 2. **Scenario Management**
- Debt state can be saved with loan scenarios (planned feature)
- Import/export includes debt information
- Consistent data across tool sessions

### 3. **UI Integration**
- Seamless integration with existing loan comparison interface
- Consistent styling and user experience
- Modal-based debt selection for each loan program

## Configuration Options

```typescript
interface DebtManagementConfig {
  allowQuickTotal: boolean;        // Enable quick total input
  allowDetailedDebts: boolean;     // Enable detailed debt tracking
  allowPerProgramSelection: boolean; // Enable per-program selections
  defaultCategories: string[];     // Available debt categories
  autoCalculateDTI: boolean;       // Auto-update DTI calculations
}
```

## API Reference

### DebtManagementPlugin Methods

#### Debt Operations
- `addDebt(debtData)` → `DebtItem`
- `updateDebt(debtId, updates)` → `boolean`
- `removeDebt(debtId)` → `boolean`
- `getDebt(debtId)` → `DebtItem | null`
- `getAllDebts()` → `DebtItem[]`
- `getDebtsByCategory(category)` → `DebtItem[]`

#### Program Selection
- `setProgramDebtSelection(programId, selection)` → `void`
- `getProgramDebtSelection(programId)` → `ProgramDebtSelection | null`

#### Calculations
- `calculateDebtForProgram(programId)` → `DebtCalculationResult`
- `calculateTotalDebt()` → `DebtCalculationResult`

#### Data Management
- `exportDebts()` → `any`
- `importDebts(data)` → `boolean`
- `validateDebt(debtData)` → `{ valid: boolean; errors: string[] }`

#### State Management
- `getState()` → `DebtManagementState`
- `setState(updates)` → `void`
- `reset()` → `void`

### Event System
- `on(event, callback)` - Subscribe to events
- `off(event, callback)` - Unsubscribe from events

**Available Events:**
- `stateChanged` - Debt state updated
- `debtAdded` - New debt added
- `debtUpdated` - Debt modified
- `debtRemoved` - Debt deleted
- `programSelectionChanged` - Program debt selection changed
- `debtsImported` - Debts imported from external source
- `reset` - Plugin state reset

## Best Practices

### 1. **Plugin Lifecycle**
```typescript
// Initialize plugin with configuration
const debtPlugin = new DebtManagementPlugin(config);

// Set up event listeners
debtPlugin.on('stateChanged', handleStateChange);

// Clean up when component unmounts
useEffect(() => {
  return () => {
    debtPlugin.off('stateChanged', handleStateChange);
  };
}, []);
```

### 2. **Error Handling**
```typescript
// Always validate debt data
const validation = debtPlugin.validateDebt(debtData);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Handle plugin operations safely
try {
  const result = debtPlugin.calculateDebtForProgram(programId);
  // Use result...
} catch (error) {
  console.error('Calculation failed:', error);
}
```

### 3. **Performance Optimization**
- Use event listeners to update UI only when necessary
- Batch debt operations when possible
- Cache calculation results for frequently accessed programs

## Future Enhancements

### Planned Features
1. **Enhanced Scenario Management** - Save debt state with loan scenarios
2. **Debt Consolidation Analysis** - Calculate consolidation benefits
3. **Payoff Calculators** - Debt payoff strategies and timelines
4. **Credit Score Integration** - Factor credit scores into calculations
5. **Advanced Reporting** - Detailed debt analysis and recommendations

### Extensibility
The plugin architecture makes it easy to add new features:
- Custom debt categories
- Additional calculation methods
- Integration with external debt services
- Advanced validation rules
- Custom export formats

## Troubleshooting

### Common Issues

1. **Debt calculations not updating**
   - Ensure event listeners are properly set up
   - Check that `autoCalculateDTI` is enabled in config

2. **Per-program selections not saving**
   - Verify program IDs are consistent
   - Check that debt items have valid IDs

3. **Import/export not working**
   - Validate data format before importing
   - Ensure all required fields are present

### Debug Mode
Enable debug logging:
```typescript
const debtPlugin = new DebtManagementPlugin({
  ...config,
  debug: true // Enable debug logging
});
```

## Contributing

To extend the debt management system:

1. **Add new debt categories** - Update `defaultCategories` in config
2. **Create custom calculations** - Extend the plugin with new methods
3. **Add UI components** - Create new React components for specific features
4. **Implement new export formats** - Extend the export functionality

## License

This enhanced debt management system is part of the Financial Tools Platform and follows the same licensing terms as the main project.
