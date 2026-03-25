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
 * Map a text offset (in plain-text terms) to a ProseMirror document position.
 * ProseMirror positions count structural tokens (nodes) in addition to text,
 * so we walk the doc to find the actual position.
 */
function textOffsetToPos(doc: import('@tiptap/pm/model').Node, offset: number): number {
  let charsSeen = 0;
  let result = -1;

  doc.descendants((node, pos) => {
    if (result >= 0) return false; // already found
    if (node.isText && node.text) {
      const nodeEnd = charsSeen + node.text.length;
      if (offset >= charsSeen && offset <= nodeEnd) {
        result = pos + (offset - charsSeen);
        return false;
      }
      charsSeen = nodeEnd;
    }
    return true; // continue traversal
  });

  return result;
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
          const docText = doc.textContent;

          // Walk through the 'after' content (which matches the current doc)
          // and create decorations for added regions.
          // textOffset tracks position in the plain-text representation.
          let textOffset = 0;
          for (const hunk of hunks) {
            if (hunk.type === 'added') {
              const hunkText = hunk.value.trimEnd();
              const startIdx = docText.indexOf(hunkText, textOffset);
              if (startIdx >= 0) {
                const endIdx = startIdx + hunkText.length;
                const from = textOffsetToPos(doc, startIdx);
                const to = textOffsetToPos(doc, endIdx);

                if (from >= 0 && to >= 0 && to > from) {
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: 'diff-added',
                    }),
                  );
                }
              }
              textOffset += hunk.value.length;
            } else if (hunk.type === 'unchanged') {
              textOffset += hunk.value.length;
            }
            // 'removed' hunks don't have positions in the current document
          }

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
