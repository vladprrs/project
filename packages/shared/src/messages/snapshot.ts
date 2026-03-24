import type { Feature } from '../types/feature.js';

export interface SnapshotEvent {
  type: 'snapshot';
  activeFeature: Feature | null;
}
