import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cloudflareService } from '@/services/cloudflareService';

export interface HeaderState {
  show: boolean;
  leftLogo: string;
  rightLogo: string;
  govName: string;
  schoolName: string;
  schoolAddress: string;
}

export interface Draft {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  header?: HeaderState;
  editorState?: any;
}

interface DraftState {
  drafts: Draft[];
  saveDraft: (draft: Draft) => void;
  deleteDraft: (id: string) => void;
  fetchDraftsFromCloudflare: () => Promise<void>;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      saveDraft: (draft) => set((state) => {
        const existing = state.drafts.findIndex(d => d.id === draft.id);
        if (existing !== -1) {
          const newDrafts = [...state.drafts];
          newDrafts[existing] = draft;
          return { drafts: newDrafts };
        }
        return { drafts: [draft, ...state.drafts] };
      }),
      deleteDraft: (id) => set((state) => ({
        drafts: state.drafts.filter(d => d.id !== id)
      })),
      fetchDraftsFromCloudflare: async () => {
        try {
          const results = await cloudflareService.queryD1<any>('SELECT * FROM drafts ORDER BY updatedAt DESC');
          const drafts: Draft[] = results.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            updatedAt: row.updatedAt,
            editorState: JSON.parse(row.editorState)
          }));
          set({ drafts });
        } catch (err) {
          console.error('Failed to fetch drafts from Cloudflare:', err);
        }
      }
    }),
    {
      name: 'eduapp-drafts',
    }
  )
);
