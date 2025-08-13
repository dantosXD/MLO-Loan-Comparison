/**
 * Core interfaces for the extensible financial tools platform
 */

export interface IToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'loan' | 'investment' | 'budget' | 'tax' | 'insurance' | 'general';
  icon?: string;
  tags: string[];
  author?: string;
  supportedFormats?: string[];
}

export interface IToolData {
  [key: string]: any;
}

export interface IToolResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
}

export interface IToolExport {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  data: any;
  filename?: string;
}

export interface IToolImport {
  format: 'json' | 'csv' | 'xlsx' | 'eml';
  data: any;
  validate?: boolean;
}

/**
 * Core interface that all financial tools must implement
 */
export interface ITool {
  // Metadata
  readonly metadata: IToolMetadata;
  
  // Data management
  getData(): IToolData;
  setData(data: IToolData): IToolResult;
  validateData(data: IToolData): IToolResult;
  resetData(): void;
  
  // Calculations
  calculate(data?: IToolData): IToolResult;
  
  // Import/Export
  exportData(format: IToolExport['format']): IToolExport;
  importData(importData: IToolImport): IToolResult;
  
  // Lifecycle
  initialize(): Promise<IToolResult>;
  cleanup(): void;
  
  // Events (optional)
  onDataChange?(data: IToolData): void;
  onCalculationComplete?(result: IToolResult): void;
}

/**
 * Tool configuration interface
 */
export interface IToolConfig {
  enableAutoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  enableExport?: boolean;
  enableImport?: boolean;
  supportedImportFormats?: string[];
  supportedExportFormats?: string[];
  customSettings?: Record<string, any>;
}

/**
 * Tool registry entry
 */
export interface IToolRegistryEntry {
  tool: ITool;
  config: IToolConfig;
  isActive: boolean;
  lastUsed?: Date;
}
