import express from 'express';
import { submitForm, getSession, startGame, checkEligibility, verifyRedemption, completeSession, cleanupStuckSessions } from './form.js';
import { 
  getSignageConfig, 
  getSignageStats, 
  updateSignageBackground, 
  getSignageBackground,
  listSignageInstances,
  createSignageInstance,
  updateSignageInstance,
  deleteSignageInstance
} from './signage.js';
import { 
  getOutcomes, 
  createOutcome, 
  updateOutcome, 
  deleteOutcome,
  updateOutcomeWeight,
  bulkUpdateWeights,
  getWeightStats
} from './outcomes.js';
import { getUsers, getSessions, exportUsers, exportSessions, exportRedemptions } from './admin.js';
import { getValidationConfig, updateValidationConfig } from './validation.js';
import { getRedemptions, markRedemptionRedeemed, getRedemptionStats } from './redemptions.js';
import { getDuplicateAttempts, getValidationAnalytics } from './analytics.js';
import { generateToken, validateToken } from './tokens.js';

export function setupRoutes(app) {
  const router = express.Router();

  // Token endpoints
  router.get('/api/token/generate', generateToken);
  router.get('/api/token/validate', validateToken);

  // Form submission
  router.post('/api/submit', submitForm);
  router.get('/api/session/:sessionId', getSession);
  router.post('/api/session/:sessionId/start', startGame);
  router.post('/api/session/:sessionId/complete', completeSession);
  router.get('/api/check-eligibility', checkEligibility);
  router.post('/api/verify-redemption', verifyRedemption);
  
  // Signage endpoints
  router.get('/api/signage', listSignageInstances); // List all instances
  router.post('/api/signage', createSignageInstance); // Create new instance
  router.get('/api/signage/:id', getSignageConfig);
  router.patch('/api/signage/:id', updateSignageInstance); // Update instance
  router.delete('/api/signage/:id', deleteSignageInstance); // Delete instance
  router.get('/api/signage/:id/stats', getSignageStats);
  router.get('/api/signage/:id/background', getSignageBackground);
  router.put('/api/signage/:id/background', updateSignageBackground);
  
  // Outcomes management
  router.get('/api/outcomes/:signageId?', getOutcomes);
  router.post('/api/outcomes', createOutcome);
  router.put('/api/outcomes/:id', updateOutcome);
  router.patch('/api/outcomes/:id/weight', updateOutcomeWeight);
  router.put('/api/outcomes/weights/bulk', bulkUpdateWeights);
  router.get('/api/outcomes/:signageId?/weights/stats', getWeightStats);
  router.delete('/api/outcomes/:id', deleteOutcome);
  
  // Admin endpoints
  router.get('/api/admin/users', getUsers);
  router.get('/api/admin/sessions', getSessions);
  router.post('/api/admin/cleanup-sessions', cleanupStuckSessions);
  router.get('/api/admin/export/users', exportUsers);
  router.get('/api/admin/export/sessions', exportSessions);
  router.get('/api/admin/export/redemptions', exportRedemptions);

  // Validation config endpoints
  router.get('/api/validation/:signageId', getValidationConfig);
  router.put('/api/validation/:signageId', updateValidationConfig);

  // Redemptions endpoints
  router.get('/api/redemptions', getRedemptions);
  router.patch('/api/redemptions/:id/redeem', markRedemptionRedeemed);
  router.get('/api/redemptions/:signageId/stats', getRedemptionStats);

  // Analytics endpoints
  router.get('/api/analytics/duplicates', getDuplicateAttempts);
  router.get('/api/analytics/validation/:signageId', getValidationAnalytics);

  app.use(router);

}
