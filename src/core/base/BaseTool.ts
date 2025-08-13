/**
 * Base implementation for financial tools
 * Provides common functionality that most tools will need
 */

import { ITool, IToolMetadata, IToolData, IToolResult, IToolExport, IToolImport } from '../interfaces/ITool';

export abstract class BaseTool implements ITool {
  protected _data: IToolData = {};
  protected _initialized: boolean = false;

  constructor(public readonly metadata: IToolMetadata) {}

  // Abstract methods that must be implemented by concrete tools
  abstract calculate(data?: IToolData): IToolResult;
  abstract validateData(data: IToolData): IToolResult;

  // Default implementations that can be overridden
  public getData(): IToolData {
    return { ...this._data };
  }

  public setData(data: IToolData): IToolResult {
    try {
      // Validate data first
      const validation = this.validateData(data);
      if (!validation.success) {
        return validation;
      }

      this._data = { ...data };
      
      // Trigger change event if implemented
      if (this.onDataChange) {
        this.onDataChange(this._data);
      }

      return { success: true, data: this._data };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set data: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public resetData(): void {
    this._data = {};
    if (this.onDataChange) {
      this.onDataChange(this._data);
    }
  }

  public exportData(format: IToolExport['format']): IToolExport {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${this.metadata.id}_export_${timestamp}`;

    switch (format) {
      case 'json':
        return {
          format: 'json',
          data: JSON.stringify(this._data, null, 2),
          filename: `${filename}.json`
        };
      
      case 'csv':
        return {
          format: 'csv',
          data: this.convertToCSV(this._data),
          filename: `${filename}.csv`
        };
      
      default:
        throw new Error(`Export format '${format}' not supported by base implementation`);
    }
  }

  public importData(importData: IToolImport): IToolResult {
    try {
      let parsedData: any;

      switch (importData.format) {
        case 'json':
          parsedData = typeof importData.data === 'string' 
            ? JSON.parse(importData.data) 
            : importData.data;
          break;
        
        default:
          return {
            success: false,
            error: `Import format '${importData.format}' not supported by base implementation`
          };
      }

      if (importData.validate !== false) {
        const validation = this.validateData(parsedData);
        if (!validation.success) {
          return validation;
        }
      }

      return this.setData(parsedData);
    } catch (error) {
      return {
        success: false,
        error: `Failed to import data: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public async initialize(): Promise<IToolResult> {
    try {
      if (this._initialized) {
        return { success: true };
      }

      // Perform any initialization logic here
      await this.onInitialize();
      
      this._initialized = true;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize tool: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  public cleanup(): void {
    try {
      this.onCleanup();
      this._initialized = false;
    } catch (error) {
      console.error(`Error during cleanup for tool ${this.metadata.id}:`, error);
    }
  }

  // Protected methods for subclasses to override
  protected async onInitialize(): Promise<void> {
    // Override in subclasses for custom initialization
  }

  protected onCleanup(): void {
    // Override in subclasses for custom cleanup
  }

  // Utility methods
  protected convertToCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      
      return [csvHeaders, ...csvRows].join('\n');
    } else {
      // Convert object to key-value CSV
      const entries = Object.entries(data);
      return entries.map(([key, value]) => `${key},${value}`).join('\n');
    }
  }

  protected formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  protected formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  protected roundToDecimals(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // Optional event handlers (can be implemented by subclasses)
  public onDataChange?(data: IToolData): void;
  public onCalculationComplete?(result: IToolResult): void;
}
