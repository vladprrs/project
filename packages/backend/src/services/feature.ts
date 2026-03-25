import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { features, pipelineStates, transitionHistory } from '../db/schema.js';
import type { AppDatabase } from '../db/client.js';
import type { Feature } from '@specflow/shared';

export class FeatureService {
  constructor(private db: AppDatabase) {}

  getActive(): Feature | null {
    const row = this.db.select().from(features).where(eq(features.isActive, true)).get();
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      directory: row.directory,
      isActive: row.isActive,
      createdAt: row.createdAt,
      activatedAt: row.activatedAt,
    };
  }

  activate(name: string, directory: string): Feature {
    const active = this.getActive();
    if (active) {
      const error = new Error(
        `Cannot activate '${name}': feature '${active.name}' is already active. Deactivate it first.`
      );
      (error as any).status = 409;
      (error as any).activeFeature = active.name;
      throw error;
    }

    // Check if feature exists by name, reactivate it; otherwise create
    const existing = this.db.select().from(features).where(eq(features.name, name)).get();
    const now = new Date().toISOString();

    if (existing) {
      this.db.update(features)
        .set({ isActive: true, activatedAt: now, directory })
        .where(eq(features.id, existing.id))
        .run();
      return { ...existing, isActive: true, activatedAt: now, directory };
    }

    const id = nanoid();
    const feature: Feature = {
      id,
      name,
      directory,
      isActive: true,
      createdAt: now,
      activatedAt: now,
    };
    this.db.insert(features).values({
      id,
      name,
      directory,
      isActive: true,
      createdAt: now,
      activatedAt: now,
    }).run();

    // Create initial pipeline state at 'specify'
    this.db.insert(pipelineStates).values({
      id: nanoid(),
      featureId: id,
      currentStage: 'specify',
      updatedAt: now,
    }).run();

    // Log initial transition
    this.db.insert(transitionHistory).values({
      id: nanoid(),
      featureId: id,
      fromStage: null,
      toStage: 'specify',
      direction: 'forward',
      reason: 'Feature activated',
      createdAt: now,
    }).run();

    return feature;
  }

  deactivate(): string {
    const active = this.getActive();
    if (!active) {
      const error = new Error('No active feature to deactivate');
      (error as any).status = 404;
      throw error;
    }
    this.db.update(features)
      .set({ isActive: false, activatedAt: null })
      .where(eq(features.id, active.id))
      .run();
    return active.name;
  }
}
