import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HeaderOptions {
  judulUjian: string[];
  mataPelajaran: string[];
  kelas: string[];
  tahunAjaran: string[];
  waktu: string[];
}

interface AdminState {
  defaultLogos: {
    left: string;
    right: string;
  };
  options: HeaderOptions;
  setDefaultLogos: (left: string, right: string) => void;
  // Dynamic Option Management
  addOption: (field: keyof HeaderOptions, value: string) => void;
  editOption: (field: keyof HeaderOptions, index: number, value: string) => void;
  deleteOption: (field: keyof HeaderOptions, index: number) => void;
}

const DEFAULT_OPTIONS: HeaderOptions = {
  judulUjian: ['SUMATIF TENGAH SEMESTER (STS)', 'SUMATIF AKHIR SEMESTER (SAS)', 'UJIAN SEKOLAH'],
  mataPelajaran: ['IPAS', 'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'PAI', 'PJOK'],
  kelas: ['I (Satu)', 'II (Dua)', 'III (Tiga)', 'IV (Empat)', 'V (Lima)', 'VI (Enam)'],
  tahunAjaran: ['2023/2024', '2024/2025', '2025/2026', '2026/2027'],
  waktu: ['60 Menit', '90 Menit', '120 Menit'],
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      defaultLogos: {
        left: '',
        right: '',
      },
      options: DEFAULT_OPTIONS,
      setDefaultLogos: (left, right) => set({ defaultLogos: { left, right } }),
      addOption: (field, value) => set((state) => ({
        options: {
          ...state.options,
          [field]: [...state.options[field], value]
        }
      })),
      editOption: (field, index, value) => set((state) => ({
        options: {
          ...state.options,
          [field]: state.options[field].map((v, i) => i === index ? value : v)
        }
      })),
      deleteOption: (field, index) => set((state) => ({
        options: {
          ...state.options,
          [field]: state.options[field].filter((_, i) => i !== index)
        }
      })),
    }),
    {
      name: 'eduapp-admin-settings',
    }
  )
);
