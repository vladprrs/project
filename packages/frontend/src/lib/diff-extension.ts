import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { DiffHunk } from './diff-compute.js';

export const diffPluginKey = new PluginKey('diffOverlay');

// Declare custom commands on TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diffOverlay: {
      setDiffDecorations: (hunks: DiffHunk[]) => ReturnType;
      clearDiffDecorations: () => ReturnType;
    };
  }
}

/**
 * Build a set of line texts that were added in the diff.
 * Each line is trimmed for fuzzy matching against ProseMirror node text.
 */
function getAddedLines(hunks: DiffHunk[]): Set<string> {
  const added = new Set<string>();
  for (const hunk of hunks) {
    if (hunk.type === 'added') {
      const lines = hunk.value.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          // Strip common markdown syntax for matching against rendered text
          const cleaned = trimmed
            .replace(/^#{1,6}\s+/, '')   // headings
            .replace(/^\*\*(.+?)\*\*/, '$1') // bold
            .replace(/^\*(.+?)\*/, '$1')     // italic
            .replace(/^[-*+]\s+/, '')        // list items
            .replace(/^\d+\.\s+/, '')        // ordered list items
            .replace(/^>\s+/, '')            // blockquotes
            .replace(/^```\w*$/, '')         // code fences
            .trim();
          if (cleaned.length > 0) {
            added.add(cleaned);
          }
        }
      }
    }
  }
  return added;
}

export const DiffExtension = Extension.create({
  name: 'diffOverlay',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: diffPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, oldSet) => {
            const meta = tr.getMeta(diffPluginKey);
            if (meta?.decorations) return meta.decorations;
            if (meta?.clear) return DecorationSet.empty;
            return oldSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return diffPluginKey.getState(state);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setDiffDecorations:
        (hunks: DiffHunk[]) =>
        ({ editor, tr, dispatch }: { editor: import('@tiptap/core').Editor; tr: Transaction; dispatch: ((tr: Transaction) => void) | undefined }) => {
          if (!dispatch) return true;

          const doc = editor.state.doc;
          const decorations: Decoration[] = [];
          const addedLines = getAddedLines(hunks);

          // Walk top-level block nodes and decorate those whose text
          // matches any added line from the diff.
          doc.forEach((node, offset) => {
            const nodeText = node.textContent.trim();
            if (nodeText.length === 0) return;

            if (addedLines.has(nodeText)) {
              // Use node decoration to highlight the entire block
              decorations.push(
                Decoration.node(offset, offset + node.nodeSize, {
                  class: 'diff-added',
                }),
              );
            }
          });

          const decoSet = DecorationSet.create(doc, decorations);
          tr.setMeta(diffPluginKey, { decorations: decoSet });
          dispatch(tr);
          return true;
        },

      clearDiffDecorations:
        () =>
        ({ tr, dispatch }: { tr: Transaction; dispatch: ((tr: Transaction) => void) | undefined }) => {
          if (dispatch) {
            tr.setMeta(diffPluginKey, { clear: true });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
