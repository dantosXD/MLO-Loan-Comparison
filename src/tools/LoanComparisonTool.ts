/**
 * Loan Comparison Tool - Extensible implementation
 * Adapts the existing loan comparison functionality to the new extensible architecture
 */

import { BaseTool } from '../core/base/BaseTool';
import { IToolMetadata, IToolData, IToolResult, IToolExport } from '../core/interfaces/ITool';
import { LoanData, Program, Debt, DebtManagementState, DebtCalculationResult } from '../types';
import { calculateDTIForProgram, getLoanAmount } from '../utils/calculations';
import { DebtManagementPlugin } from '../core/plugins/DebtManagementPlugin';

export interface LoanComparisonData extends IToolData {
  loanData: LoanData;
  preferredProgramId?: number | null;
  scenarioName?: string;
}

export class LoanComparisonTool extends BaseTool {
  public readonly metadata: IToolMetadata = {
    id: 'loan-comparison',
    name: 'Loan Comparison Tool',
    description: 'Compare different loan programs and analyze debt-to-income ratios',
    version: '2.0.0',
    category: 'loan',
    icon: '🏠',
    tags: ['mortgage', 'loan', 'comparison', 'dti', 'financing'],
    author: 'Financial Tools Platform',
    supportedFormats: ['json', 'csv', 'xlsx', 'pdf']
  };

  constructor() {
    super({
      id: 'loan-comparison',
      name: 'Loan Comparison Tool',
      description: 'Compare different loan programs and analyze debt-to-income ratios',
      version: '2.0.0',
      category: 'loan',
      icon: '🏠',
      tags: ['mortgage', 'loan', 'comparison', 'dti', 'financing'],
      author: 'Financial Tools Platform',
      supportedFormats: ['json', 'csv', 'xlsx', 'pdf']
    });

    // Initialize with default loan data
    this._data = {
      loanData: this.getDefaultLoanData(),
      preferredProgramId: null,
      scenarioName: ''
    };
  }

  public validateData(data: IToolData): IToolResult {
    try {
      const loanData = data as LoanComparisonData;
      
      if (!loanData.loanData) {
        return { success: false, error: 'Loan data is required' };
      }

      const { loanData: loan } = loanData;
      const warnings: string[] = [];

      // Validate loan type specific fields
      if (loan.loanType === 'purchase') {
        if (!loan.purchasePrice || loan.purchasePrice <= 0) {
          return { success: false, error: 'Purchase price must be greater than 0' };
        }
        if (!loan.downPayment || loan.downPayment < 0) {
          return { success: false, error: 'Down payment must be 0 or greater' };
        }
        if (loan.downPayment >= loan.purchasePrice) {
          return { success: false, error: 'Down payment cannot be greater than or equal to purchase price' };
        }
      } else if (loan.loanType === 'refinance') {
        if (!loan.refinanceLoanAmount || loan.refinanceLoanAmount <= 0) {
          return { success: false, error: 'Refinance loan amount must be greater than 0' };
        }
      }

      // Validate income
      if (!loan.grossMonthlyIncome || loan.grossMonthlyIncome <= 0) {
        warnings.push('Gross monthly income should be provided for accurate DTI calculations');
      }

      // Validate programs
      if (!loan.programs || loan.programs.length === 0) {
        warnings.push('At least one loan program should be added for comparison');
      } else {
        loan.programs.forEach((program, index) => {
          if (!program.rate || program.rate <= 0) {
            warnings.push(`Program ${index + 1}: Interest rate must be greater than 0`);
          }
          if (!program.term || program.term <= 0) {
            warnings.push(`Program ${index + 1}: Loan term must be greater than 0`);
          }
        });
      }

      // Validate debts
      if (loan.debts) {
        loan.debts.forEach((debt, index) => {
          if (debt.balance < 0) {
            warnings.push(`Debt ${index + 1}: Balance cannot be negative`);
          }
          if (debt.monthlyPayment < 0) {
            warnings.push(`Debt ${index + 1}: Monthly payment cannot be negative`);
          }
        });
      }

      return { 
        success: true, 
        warnings: warnings.length > 0 ? warnings : undefined 
      };
    } catch (error) {
      return {
        success: false,
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public calculate(data?: IToolData): IToolResult {
    try {
      const loanData = (data || this._data) as LoanComparisonData;
      const { loanData: loan } = loanData;

      if (!loan.programs || loan.programs.length === 0) {
        return { success: false, error: 'No loan programs to calculate' };
      }

      const results = {
        programs: [] as any[],
        summary: {
          totalPrograms: loan.programs.length,
          selectedPrograms: loan.programs.filter(p => p.selected).length,
          averageRate: 0,
          loanAmount: getLoanAmount(loan)
        }
      };

      // Calculate results for each program
      loan.programs.forEach(program => {
        const loanAmount = program.overrideLoanAmount || getLoanAmount(loan);
        const monthlyPI = this.calculateMonthlyPI(loanAmount, program.effectiveRate || program.rate, program.term);
        const monthlyPITI = monthlyPI + (loan.annualPropertyTax / 12) + (loan.annualHomeInsurance / 12);
        const dtiResult = calculateDTIForProgram(loan, program);

        results.programs.push({
          id: program.id,
          name: program.name,
          type: program.type,
          rate: program.rate,
          effectiveRate: program.effectiveRate || program.rate,
          term: program.term,
          loanAmount,
          monthlyPI: this.roundToDecimals(monthlyPI),
          monthlyPITI: this.roundToDecimals(monthlyPITI),
          totalDTI: this.roundToDecimals(dtiResult.totalDTI),
          housingDTI: this.roundToDecimals(dtiResult.housingDTI),
          buyDown: program.buyDown,
          buyDownCost: program.buyDownCost || 0,
          selected: program.selected
        });
      });

      // Calculate average rate for selected programs
      const selectedPrograms = results.programs.filter(p => p.selected);
      if (selectedPrograms.length > 0) {
        results.summary.averageRate = this.roundToDecimals(
          selectedPrograms.reduce((sum, p) => sum + p.effectiveRate, 0) / selectedPrograms.length
        );
      }

      const result = { success: true, data: results };
      
      if (this.onCalculationComplete) {
        this.onCalculationComplete(result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Calculation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public exportData(format: IToolExport['format']): IToolExport {
    const loanData = this._data as LoanComparisonData;
    const calculationResult = this.calculate();
    
    const exportData = {
      metadata: {
        toolId: this.metadata.id,
        toolName: this.metadata.name,
        version: this.metadata.version,
        exportedAt: new Date().toISOString(),
        scenarioName: loanData.scenarioName || 'Untitled Scenario'
      },
      loanData: loanData.loanData,
      preferredProgramId: loanData.preferredProgramId,
      calculations: calculationResult.success ? calculationResult.data : null
    };

    const timestamp = new Date().toISOString().split('T')[0];
    const scenarioName = loanData.scenarioName || 'loan_comparison';
    const filename = `${scenarioName}_${timestamp}`;

    switch (format) {
      case 'json':
        return {
          format: 'json',
          data: JSON.stringify(exportData, null, 2),
          filename: `${filename}.json`
        };

      case 'csv':
        // Export programs as CSV
        if (calculationResult.success && calculationResult.data.programs) {
          return {
            format: 'csv',
            data: this.convertToCSV(calculationResult.data.programs),
            filename: `${filename}_programs.csv`
          };
        }
        break;

      default:
        return super.exportData(format);
    }

    throw new Error(`Export format '${format}' not supported`);
  }

  // Loan-specific methods
  public addProgram(program: Partial<Program>): IToolResult {
    try {
      const loanData = this._data as LoanComparisonData;
      const newProgram: Program = {
        id: Date.now(),
        type: 'conventional',
        rate: 7.0,
        term: 30,
        selected: true,
        name: `Program ${loanData.loanData.programs.length + 1}`,
        buyDown: false,
        buyDownCost: 0,
        effectiveRate: 7.0,
        ...program
      };

      loanData.loanData.programs.push(newProgram);
      
      return this.setData(loanData);
    } catch (error) {
      return {
        success: false,
        error: `Failed to add program: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public removeProgram(programId: number): IToolResult {
    try {
      const loanData = this._data as LoanComparisonData;
      const index = loanData.loanData.programs.findIndex(p => p.id === programId);
      
      if (index === -1) {
        return { success: false, error: 'Program not found' };
      }

      loanData.loanData.programs.splice(index, 1);
      
      // Clear preferred program if it was the removed one
      if (loanData.preferredProgramId === programId) {
        loanData.preferredProgramId = null;
      }

      return this.setData(loanData);
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove program: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public updateProgram(programId: number, updates: Partial<Program>): IToolResult {
    try {
      const loanData = this._data as LoanComparisonData;
      const program = loanData.loanData.programs.find(p => p.id === programId);
      
      if (!program) {
        return { success: false, error: 'Program not found' };
      }

      Object.assign(program, updates);
      
      // Recalculate effective rate if needed
      if (updates.rate !== undefined || updates.buyDown !== undefined) {
        program.effectiveRate = program.buyDown && program.rateReduction 
          ? program.rate - program.rateReduction 
          : program.rate;
      }

      return this.setData(loanData);
    } catch (error) {
      return {
        success: false,
        error: `Failed to update program: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private calculateMonthlyPI(loanAmount: number, rate: number, term: number): number {
    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;
    
    if (monthlyRate === 0) {
      return loanAmount / numPayments;
    }
    
    return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  private getDefaultLoanData(): LoanData {
    return {
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
      debts: []
    };
  }
}
