import { diffLines, type Change } from 'diff';

export interface DiffHunk {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineCount: number;
}

export function computeDiff(before: string, after: string): DiffHunk[] {
  const changes: Change[] = diffLines(before, after);
  return changes.map((change) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
    value: change.value,
    lineCount: change.count ?? 0,
  }));
}

/** Check if the diff has any actual changes */
export function hasDiffChanges(hunks: DiffHunk[]): boolean {
  return hunks.some((h) => h.type !== 'unchanged');
}
