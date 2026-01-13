import express from 'express';
import { submitForm, getSession, startGame } from './form.js';



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
import { getUsers, getSessions } from './admin.js';

export function setupRoutes(app) {
  const router = express.Router();

  // Form submission
  router.post('/api/submit', submitForm);
  router.get('/api/session/:sessionId', getSession);
  router.post('/api/session/:sessionId/start', startGame);
  
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

  app.use(router);

}
