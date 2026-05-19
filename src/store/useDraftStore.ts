import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vercelService } from '@/services/vercelService';

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
  deleteDraftFromVercel: (id: string) => Promise<void>;
  fetchDraftsFromVercel: () => Promise<void>;
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
      deleteDraftFromVercel: async (id) => {
        try {
          await vercelService.query('DELETE FROM drafts WHERE id = $1', [id]);
          set((state) => ({
            drafts: state.drafts.filter(d => d.id !== id)
          }));
        } catch (err) {
          console.error('Failed to delete draft from Vercel:', err);
          // Still remove locally for better UX
          set((state) => ({
            drafts: state.drafts.filter(d => d.id !== id)
          }));
        }
      },
      fetchDraftsFromVercel: async () => {
        try {
          const results = await vercelService.query<any>('SELECT * FROM drafts ORDER BY updatedAt DESC');
          const drafts: Draft[] = results.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            updatedAt: row.updatedAt,
            editorState: JSON.parse(row.editorState)
          }));
          set({ drafts });
        } catch (err) {
          console.error('Failed to fetch drafts from Vercel:', err);
        }
      }
    }),
    {
      name: 'eduapp-drafts',
    }
  )
);
