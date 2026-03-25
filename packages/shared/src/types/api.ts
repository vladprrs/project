import type { Feature } from './feature.js';

// GET /api/features/active
export interface GetActiveFeatureResponse {
  feature: Feature | null;
}

// POST /api/features/activate
export interface ActivateFeatureRequest {
  name: string;
  directory: string;
}

export interface ActivateFeatureResponse {
  feature: Feature;
}

// POST /api/features/activate -- 409 Conflict
export interface ActivateFeatureConflict {
  error: string;
  activeFeature: string;
}

// DELETE /api/features/active
export interface DeactivateFeatureResponse {
  deactivated: string;
}

// Error responses
export interface ApiError {
  error: string;
}
