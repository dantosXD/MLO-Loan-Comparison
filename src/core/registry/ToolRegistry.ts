/**
 * Central registry for managing financial tools
 */

import { ITool, IToolConfig, IToolRegistryEntry, IToolMetadata } from '../interfaces/ITool';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, IToolRegistryEntry> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a new tool
   */
  public registerTool(tool: ITool, config: IToolConfig = {}): boolean {
    try {
      const entry: IToolRegistryEntry = {
        tool,
        config: {
          enableAutoSave: true,
          autoSaveInterval: 30000, // 30 seconds
          enableExport: true,
          enableImport: true,
          supportedImportFormats: ['json', 'csv', 'xlsx'],
          supportedExportFormats: ['json', 'csv', 'xlsx', 'pdf'],
          ...config
        },
        isActive: false,
        lastUsed: new Date()
      };

      this.tools.set(tool.metadata.id, entry);
      this.emit('toolRegistered', { toolId: tool.metadata.id, metadata: tool.metadata });
      
      return true;
    } catch (error) {
      console.error(`Failed to register tool ${tool.metadata.id}:`, error);
      return false;
    }
  }

  /**
   * Unregister a tool
   */
  public unregisterTool(toolId: string): boolean {
    const entry = this.tools.get(toolId);
    if (entry) {
      try {
        entry.tool.cleanup();
        this.tools.delete(toolId);
        this.emit('toolUnregistered', { toolId });
        return true;
      } catch (error) {
        console.error(`Failed to unregister tool ${toolId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get a tool by ID
   */
  public getTool(toolId: string): ITool | null {
    const entry = this.tools.get(toolId);
    return entry ? entry.tool : null;
  }

  /**
   * Get tool configuration
   */
  public getToolConfig(toolId: string): IToolConfig | null {
    const entry = this.tools.get(toolId);
    return entry ? entry.config : null;
  }

  /**
   * Get all registered tools
   */
  public getAllTools(): IToolMetadata[] {
    return Array.from(this.tools.values()).map(entry => entry.tool.metadata);
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): IToolMetadata[] {
    return Array.from(this.tools.values())
      .filter(entry => entry.tool.metadata.category === category)
      .map(entry => entry.tool.metadata);
  }

  /**
   * Activate a tool
   */
  public async activateTool(toolId: string): Promise<boolean> {
    const entry = this.tools.get(toolId);
    if (entry && !entry.isActive) {
      try {
        const result = await entry.tool.initialize();
        if (result.success) {
          entry.isActive = true;
          entry.lastUsed = new Date();
          this.emit('toolActivated', { toolId });
          return true;
        } else {
          console.error(`Failed to activate tool ${toolId}:`, result.error);
          return false;
        }
      } catch (error) {
        console.error(`Error activating tool ${toolId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Deactivate a tool
   */
  public deactivateTool(toolId: string): boolean {
    const entry = this.tools.get(toolId);
    if (entry && entry.isActive) {
      try {
        entry.tool.cleanup();
        entry.isActive = false;
        this.emit('toolDeactivated', { toolId });
        return true;
      } catch (error) {
        console.error(`Error deactivating tool ${toolId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Check if a tool is active
   */
  public isToolActive(toolId: string): boolean {
    const entry = this.tools.get(toolId);
    return entry ? entry.isActive : false;
  }

  /**
   * Update tool configuration
   */
  public updateToolConfig(toolId: string, config: Partial<IToolConfig>): boolean {
    const entry = this.tools.get(toolId);
    if (entry) {
      entry.config = { ...entry.config, ...config };
      this.emit('toolConfigUpdated', { toolId, config: entry.config });
      return true;
    }
    return false;
  }

  /**
   * Event system
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalTools: number;
    activeTools: number;
    toolsByCategory: Record<string, number>;
  } {
    const tools = Array.from(this.tools.values());
    const stats = {
      totalTools: tools.length,
      activeTools: tools.filter(entry => entry.isActive).length,
      toolsByCategory: {} as Record<string, number>
    };

    tools.forEach(entry => {
      const category = entry.tool.metadata.category;
      stats.toolsByCategory[category] = (stats.toolsByCategory[category] || 0) + 1;
    });

    return stats;
  }
}
