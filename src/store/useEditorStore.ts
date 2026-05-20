import { create } from 'zustand';

interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: 'pg' | 'isian' | 'uraian';
  text: string;
  options?: QuestionOption[];
  bobot: number;
  tingkatKesulitan?: string;
  pembahasan: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface EditorHeaderState {
  logoLeft: string;
  logoRight: string;
  foundationName: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string; // "Telp. (021) 1234567 | www.sdncemerlang.sch.id"
  judulUjian: string;
  mataPelajaran: string;
  kelas: string;
  semester: string;
  tahunAjaran: string;
  waktu: string;
}

interface EditorState {
  header: EditorHeaderState;
  questions: Question[];
  setHeaderField: (field: keyof EditorHeaderState, value: string) => void;
  addQuestion: (type: Question['type'], data?: Partial<Question>) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  updateOption: (questionId: string, optionIndex: number, text: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  header: {
    logoLeft: '',
    logoRight: '',
    foundationName: 'YAYASAN WAKAF MASJID NURUL KAUTSAR',
    schoolName: 'SD IT NURUL KAUTSAR',
    schoolAddress: 'Jl. Andi Mangerangi No. 47, Makassar, Indonesia',
    schoolContact: 'Telp. 082344659435 I Email: sditnurulkautsarbalbod@gmail.com',
    judulUjian: '',
    mataPelajaran: '',
    kelas: '',
    semester: '',
    tahunAjaran: '',
    waktu: ''
  },
  questions: [],
  setHeaderField: (field, value) => set((state) => ({
    header: { ...state.header, [field]: value }
  })),
  addQuestion: (type, data) => set((state) => ({
    questions: [
      ...state.questions,
      {
        id: data?.id || Date.now().toString(),
        type,
        text: data?.text || '',
        options: data?.options || (type === 'pg' ? [{id: 'A', text: ''},{id: 'B', text: ''},{id: 'C', text: ''},{id: 'D', text: ''}] : undefined),
        bobot: data?.bobot || 1,
        tingkatKesulitan: data?.tingkatKesulitan || 'Sedang',
        pembahasan: data?.pembahasan || ''
      }
    ]
  })),
  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map(q => q.id === id ? { ...q, ...updates } : q)
  })),
  updateOption: (questionId, optionIndex, text) => set((state) => ({
    questions: state.questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex].text = text;
        return { ...q, options: newOptions };
      }
      return q;
    })
  })),
  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter(q => q.id !== id)
  }))
}));
