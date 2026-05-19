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
  defaultSchoolInfo: {
    yayasan: string;
    namaSekolah: string;
    alamat: string;
    kontak: string;
  };
  options: HeaderOptions;
  setDefaultLogos: (left: string, right: string) => void;
  setDefaultSchoolInfo: (info: Partial<AdminState['defaultSchoolInfo']>) => void;
  // Dynamic Option Management
  addOption: (field: keyof HeaderOptions, value: string) => void;
  editOption: (field: keyof HeaderOptions, index: number, value: string) => void;
  deleteOption: (field: keyof HeaderOptions, index: number) => void;
}

const DEFAULT_OPTIONS: HeaderOptions = {
  judulUjian: [],
  mataPelajaran: [],
  kelas: [],
  tahunAjaran: [],
  waktu: [],
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      defaultLogos: {
        left: '',
        right: '',
      },
      defaultSchoolInfo: {
        yayasan: 'YAYASAN PENDIDIKAN NURUL KAUTSAR',
        namaSekolah: 'SD IT NURUL KAUTSAR',
        alamat: 'Jl. Andi Mangerangi No. 47, Makassar, Indonesia',
        kontak: 'Telp. 082344659435 I Email: sditnurulkautsarbalbod@gmail.com',
      },
      options: DEFAULT_OPTIONS,
      setDefaultLogos: (left, right) => set({ defaultLogos: { left, right } }),
      setDefaultSchoolInfo: (info) => set((state) => ({ 
        defaultSchoolInfo: { ...state.defaultSchoolInfo, ...info } 
      })),
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
