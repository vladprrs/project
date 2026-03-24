import { Router } from 'express';
import type { FeatureService } from '../services/feature.js';
import type {
  GetActiveFeatureResponse,
  ActivateFeatureRequest,
  ActivateFeatureResponse,
  ActivateFeatureConflict,
  DeactivateFeatureResponse,
  ApiError,
} from '@specflow/shared';

export function createFeaturesRouter(featureService: FeatureService): Router {
  const router = Router();

  // GET /api/features/active
  router.get('/active', (_req, res) => {
    const feature = featureService.getActive();
    const response: GetActiveFeatureResponse = { feature };
    res.json(response);
  });

  // POST /api/features/activate
  router.post('/activate', (req, res) => {
    const { name, directory } = req.body as ActivateFeatureRequest;
    if (!name || !directory) {
      const error: ApiError = { error: 'name and directory are required' };
      res.status(400).json(error);
      return;
    }
    try {
      const feature = featureService.activate(name, directory);
      const response: ActivateFeatureResponse = { feature };
      res.json(response);
    } catch (err: any) {
      if (err.status === 409) {
        const conflict: ActivateFeatureConflict = {
          error: err.message,
          activeFeature: err.activeFeature,
        };
        res.status(409).json(conflict);
        return;
      }
      throw err;
    }
  });

  // DELETE /api/features/active
  router.delete('/active', (_req, res) => {
    try {
      const name = featureService.deactivate();
      const response: DeactivateFeatureResponse = { deactivated: name };
      res.json(response);
    } catch (err: any) {
      if (err.status === 404) {
        const error: ApiError = { error: err.message };
        res.status(404).json(error);
        return;
      }
      throw err;
    }
  });

  return router;
}
