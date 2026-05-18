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
  correctAnswer?: string;
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
  schoolName: string;
  schoolAddress: string;
  schoolContact: string; // "Telp. (021) 1234567 | www.sdncemerlang.sch.id"
  schoolEmail: string; // "info@sdncemerlang.sch.id"
  judulUjian: string;
  mataPelajaran: string;
  kelas: string;
  semester: string;
  tahunAjaran: string;
  waktu: string;
}

export interface PdfSettings {
  paperSize: string;
  orientation: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  fontFamily: string;
  fontSize: string;
}

interface EditorState {
  header: EditorHeaderState;
  questions: Question[];
  pdfSettings: PdfSettings;
  setHeaderField: (field: keyof EditorHeaderState, value: string) => void;
  addQuestion: (type: Question['type']) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  updateOption: (questionId: string, optionIndex: number, text: string) => void;
  setPdfSetting: (field: keyof PdfSettings, value: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  header: {
    logoLeft: '',
    logoRight: '',
    schoolName: 'SD IT NURUL KAUTSAR',
    schoolAddress: 'Jl. Andi Mangerangi No. 47, Makassar, Indonesia',
    schoolContact: 'Telp. 082344659435',
    schoolEmail: 'Email: sditnurulkautsarbalbod@gmail.com',
    judulUjian: '',
    mataPelajaran: '',
    kelas: '',
    semester: '',
    tahunAjaran: '',
    waktu: '60 Menit'
  },
  questions: [],
  pdfSettings: {
    paperSize: 'F4', // F4 (21.0 x 33.0 cm)
    orientation: 'Portrait',
    marginTop: '1.5 cm',
    marginBottom: '1.5 cm',
    marginLeft: '1.5 cm',
    marginRight: '1.5 cm',
    fontFamily: 'Times New Roman',
    fontSize: '12 pt'
  },
  setHeaderField: (field, value) => set((state) => ({
    header: { ...state.header, [field]: value }
  })),
  addQuestion: (type) => set((state) => ({
    questions: [
      ...state.questions,
      {
        id: Date.now().toString(),
        type,
        text: '',
        options: type === 'pg' ? [{id: 'A', text: ''},{id: 'B', text: ''},{id: 'C', text: ''},{id: 'D', text: ''}] : undefined,
        correctAnswer: 'A',
        bobot: 1,
        pembahasan: ''
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
  })),
  setPdfSetting: (field, value) => set((state) => ({
    pdfSettings: { ...state.pdfSettings, [field]: value }
  }))
}));
