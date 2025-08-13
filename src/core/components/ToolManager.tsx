/**
 * Tool Manager Component - Main interface for the extensible tools platform
 */

import React, { useState, useEffect } from 'react';
import { ToolRegistry } from '../registry/ToolRegistry';
import { ITool, IToolMetadata } from '../interfaces/ITool';

interface ToolManagerProps {
  className?: string;
}

interface ToolState {
  activeTool: ITool | null;
  availableTools: IToolMetadata[];
  isLoading: boolean;
  error: string | null;
}

export const ToolManager: React.FC<ToolManagerProps> = ({ className = '' }) => {
  const [state, setState] = useState<ToolState>({
    activeTool: null,
    availableTools: [],
    isLoading: true,
    error: null
  });

  const registry = ToolRegistry.getInstance();

  useEffect(() => {
    // Load available tools
    const loadTools = async () => {
      try {
        const tools = registry.getAllTools();
        setState(prev => ({
          ...prev,
          availableTools: tools,
          isLoading: false
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load tools',
          isLoading: false
        }));
      }
    };

    loadTools();

    // Listen for registry events
    const handleToolRegistered = (data: { toolId: string; metadata: IToolMetadata }) => {
      setState(prev => ({
        ...prev,
        availableTools: [...prev.availableTools, data.metadata]
      }));
    };

    const handleToolUnregistered = (data: { toolId: string }) => {
      setState(prev => ({
        ...prev,
        availableTools: prev.availableTools.filter(tool => tool.id !== data.toolId),
        activeTool: prev.activeTool?.metadata.id === data.toolId ? null : prev.activeTool
      }));
    };

    registry.on('toolRegistered', handleToolRegistered);
    registry.on('toolUnregistered', handleToolUnregistered);

    return () => {
      registry.off('toolRegistered', handleToolRegistered);
      registry.off('toolUnregistered', handleToolUnregistered);
    };
  }, [registry]);

  const handleToolSelect = async (toolId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Deactivate current tool if any
      if (state.activeTool) {
        registry.deactivateTool(state.activeTool.metadata.id);
      }

      // Activate new tool
      const success = await registry.activateTool(toolId);
      if (success) {
        const tool = registry.getTool(toolId);
        setState(prev => ({
          ...prev,
          activeTool: tool,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: `Failed to activate tool: ${toolId}`,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false
      }));
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      loan: '🏠',
      investment: '📈',
      budget: '💰',
      tax: '📊',
      insurance: '🛡️',
      general: '🔧'
    };
    return icons[category] || '🔧';
  };

  const groupToolsByCategory = (tools: IToolMetadata[]) => {
    return tools.reduce((groups, tool) => {
      const category = tool.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
      return groups;
    }, {} as Record<string, IToolMetadata[]>);
  };

  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tools...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const toolGroups = groupToolsByCategory(state.availableTools);

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Financial Tools Platform</h1>
        <p className="text-gray-600 mt-1">
          Select a tool to get started with your financial analysis
        </p>
      </div>

      {/* Active Tool Display */}
      {state.activeTool && (
        <div className="border-b border-gray-200 p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{state.activeTool.metadata.icon}</span>
              <div>
                <h3 className="font-medium text-gray-800">{state.activeTool.metadata.name}</h3>
                <p className="text-sm text-gray-600">{state.activeTool.metadata.description}</p>
              </div>
            </div>
            <button
              onClick={() => {
                registry.deactivateTool(state.activeTool!.metadata.id);
                setState(prev => ({ ...prev, activeTool: null }));
              }}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Close tool"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tool Selection */}
      <div className="p-6">
        {Object.keys(toolGroups).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🔧</div>
            <h3 className="text-gray-600 font-medium mb-2">No Tools Available</h3>
            <p className="text-gray-500 text-sm">
              No financial tools have been registered yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(toolGroups).map(([category, tools]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">{getCategoryIcon(category)}</span>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Tools
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tools.map((tool) => (
                    <div
                      key={tool.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        state.activeTool?.metadata.id === tool.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleToolSelect(tool.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{tool.icon}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          v{tool.version}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800 mb-1">{tool.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {tool.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {tool.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{tool.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{state.availableTools.length} tools available</span>
          <span>
            {state.activeTool ? `Active: ${state.activeTool.metadata.name}` : 'No active tool'}
          </span>
        </div>
      </div>
    </div>
  );
};
