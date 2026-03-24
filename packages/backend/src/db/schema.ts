import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  directory: text('directory').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  activatedAt: text('activated_at'),
});

export const pipelineStates = sqliteTable('pipeline_states', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().unique().references(() => features.id),
  currentStage: text('current_stage').notNull().default('specify'),
  updatedAt: text('updated_at').notNull(),
});

export const transitionHistory = sqliteTable('transition_history', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().references(() => features.id),
  fromStage: text('from_stage'),
  toStage: text('to_stage').notNull(),
  direction: text('direction').notNull(),
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
});

export const taskCardCache = sqliteTable('task_card_cache', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().references(() => features.id),
  taskId: text('task_id').notNull(),
  phase: text('phase').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
  isParallel: integer('is_parallel', { mode: 'boolean' }).notNull().default(false),
  userStory: text('user_story'),
  filePaths: text('file_paths'),
  sortOrder: integer('sort_order').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().references(() => features.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
});
