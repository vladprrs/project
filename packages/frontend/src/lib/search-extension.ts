import { Extension } from '@tiptap/core';
import { search, SearchQuery, setSearchState } from 'prosemirror-search';

// Declare custom commands on TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchQuery: (query: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export interface SearchExtensionStorage {
  searchVisible: boolean;
}

export const SearchExtension = Extension.create<object, SearchExtensionStorage>({
  name: 'search',

  addStorage() {
    return { searchVisible: false };
  },

  addProseMirrorPlugins() {
    return [search()];
  },

  addCommands() {
    return {
      setSearchQuery:
        (query: string) =>
        ({ tr, dispatch }: { tr: import('@tiptap/pm/state').Transaction; dispatch: ((tr: import('@tiptap/pm/state').Transaction) => void) | undefined }) => {
          if (dispatch) {
            const sq = new SearchQuery({ search: query, caseSensitive: false });
            setSearchState(tr, sq);
            dispatch(tr);
          }
          return true;
        },
      clearSearch:
        () =>
        ({ tr, dispatch }: { tr: import('@tiptap/pm/state').Transaction; dispatch: ((tr: import('@tiptap/pm/state').Transaction) => void) | undefined }) => {
          if (dispatch) {
            setSearchState(tr, new SearchQuery({ search: '' }));
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-f': () => {
        this.storage.searchVisible = true;
        // Parent component reads editor.storage.search.searchVisible
        // to show the SearchBar
        return true; // prevent browser's native search
      },
      Escape: () => {
        if (this.storage.searchVisible) {
          this.storage.searchVisible = false;
          this.editor.commands.clearSearch();
          return true;
        }
        return false;
      },
    };
  },
});
