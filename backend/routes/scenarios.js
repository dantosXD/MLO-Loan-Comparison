const express = require('express');
const router = express.Router();
const scenarioService = require('../services/scenarioService');

// Middleware for request validation
const validateScenarioData = (req, res, next) => {
  const { name, loanData } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ 
      error: 'Scenario name is required' 
    });
  }
  
  if (!loanData) {
    return res.status(400).json({ 
      error: 'Loan data is required' 
    });
  }
  
  next();
};

// GET /api/scenarios - Get all scenarios
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Default to user 1 for single-user mode
    const scenarios = await scenarioService.getScenarios(userId);
    
    res.json({
      success: true,
      data: scenarios,
      count: scenarios.length
    });
  } catch (error) {
    console.error('GET /scenarios error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scenarios'
    });
  }
});

// GET /api/scenarios/:name - Get specific scenario
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.user?.id || 1;
    
    const scenario = await scenarioService.loadScenario(decodeURIComponent(name), userId);
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }
    
    res.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('GET /scenarios/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load scenario'
    });
  }
});

// POST /api/scenarios - Create or update scenario
router.post('/', validateScenarioData, async (req, res) => {
  try {
    const { name, loanData, preferredProgramId } = req.body;
    const userId = req.user?.id || 1;
    
    const result = await scenarioService.saveScenario(
      name.trim(),
      loanData,
      userId,
      preferredProgramId
    );
    
    res.status(result.created ? 201 : 200).json({
      success: true,
      data: result,
      message: result.created ? 'Scenario created successfully' : 'Scenario updated successfully'
    });
  } catch (error) {
    console.error('POST /scenarios error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save scenario'
    });
  }
});

// PUT /api/scenarios/:name - Update specific scenario
router.put('/:name', validateScenarioData, async (req, res) => {
  try {
    const { name: urlName } = req.params;
    const { name, loanData, preferredProgramId } = req.body;
    const userId = req.user?.id || 1;
    
    // Check if scenario exists
    const existing = await scenarioService.loadScenario(decodeURIComponent(urlName), userId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }
    
    const result = await scenarioService.saveScenario(
      name.trim(),
      loanData,
      userId,
      preferredProgramId
    );
    
    res.json({
      success: true,
      data: result,
      message: 'Scenario updated successfully'
    });
  } catch (error) {
    console.error('PUT /scenarios/:name error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scenario'
    });
  }
});

// DELETE /api/scenarios/:name - Delete scenario
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.user?.id || 1;
    
    const result = await scenarioService.deleteScenario(decodeURIComponent(name), userId);
    
    res.json({
      success: true,
      data: result,
      message: 'Scenario deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /scenarios/:name error:', error);
    
    if (error.message === 'Scenario not found') {
      res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete scenario'
      });
    }
  }
});

// POST /api/scenarios/export - Export all scenarios
router.post('/export', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const exportData = await scenarioService.exportScenarios(userId);
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('POST /scenarios/export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export scenarios'
    });
  }
});

// POST /api/scenarios/import - Import scenarios
router.post('/import', async (req, res) => {
  try {
    const { importData, overwrite = false } = req.body;
    const userId = req.user?.id || 1;
    
    if (!importData) {
      return res.status(400).json({
        success: false,
        error: 'Import data is required'
      });
    }
    
    const result = await scenarioService.importScenarios(importData, userId, overwrite);
    
    res.json({
      success: true,
      data: result,
      message: `Successfully imported ${result.imported} scenarios`
    });
  } catch (error) {
    console.error('POST /scenarios/import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import scenarios'
    });
  }
});

// POST /api/scenarios/current-state - Save current working state
router.post('/current-state', async (req, res) => {
  try {
    const { loanData } = req.body;
    const userId = req.user?.id || 1;
    
    if (!loanData) {
      return res.status(400).json({
        success: false,
        error: 'Loan data is required'
      });
    }
    
    const result = await scenarioService.saveCurrentState(loanData, userId);
    
    res.json({
      success: true,
      data: result,
      message: 'Current state saved successfully'
    });
  } catch (error) {
    console.error('POST /scenarios/current-state error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save current state'
    });
  }
});

// GET /api/scenarios/current-state - Load current working state
router.get('/current-state', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const loanData = await scenarioService.loadCurrentState(userId);
    
    res.json({
      success: true,
      data: loanData
    });
  } catch (error) {
    console.error('GET /scenarios/current-state error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load current state'
    });
  }
});

// GET /api/scenarios/stats - Get scenario statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const stats = await scenarioService.getStatistics(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('GET /scenarios/stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

module.exports = router;
