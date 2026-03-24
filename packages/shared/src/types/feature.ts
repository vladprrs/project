export const PIPELINE_STAGES = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'verify', 'ship'] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

export const TRANSITION_DIRECTIONS = ['forward', 'backward'] as const;
export type TransitionDirection = typeof TRANSITION_DIRECTIONS[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const CHAT_ROLES = ['user', 'assistant', 'system'] as const;
export type ChatRole = typeof CHAT_ROLES[number];

export interface Feature {
  id: string;
  name: string;
  directory: string;
  isActive: boolean;
  createdAt: string;
  activatedAt: string | null;
}

export interface PipelineState {
  id: string;
  featureId: string;
  currentStage: PipelineStage;
  updatedAt: string;
}

export interface TransitionHistory {
  id: string;
  featureId: string;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  direction: TransitionDirection;
  reason: string | null;
  createdAt: string;
}

export interface TaskCardCache {
  id: string;
  featureId: string;
  taskId: string;
  phase: string;
  description: string;
  status: TaskStatus;
  isParallel: boolean;
  userStory: string | null;
  filePaths: string | null;
  sortOrder: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  featureId: string;
  role: ChatRole;
  content: string;
  metadata: string | null;
  createdAt: string;
}
