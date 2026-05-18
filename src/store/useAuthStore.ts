import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'guru' | 'operator';

export interface User {
  id: string;
  nama: string;
  username: string;
  password?: string; // Only stored in mock database
  role: UserRole;
  foto?: string;
}

interface AuthState {
  user: User | null;
  users: User[];
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  // Admin User Management
  addUser: (user: User) => void;
  editUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const DEFAULT_USERS: User[] = [
  { id: '1', nama: 'Admin Sekolah', username: 'admin', password: 'admin123', role: 'admin' },
  { id: '2', nama: 'Guru Pengajar', username: 'guru', password: 'guru', role: 'guru' },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      users: DEFAULT_USERS,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      addUser: (newUser) => set((state) => ({ users: [...state.users, newUser] })),
      editUser: (id, updates) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
      })),
      deleteUser: (id) => set((state) => {
        const userToDelete = state.users.find(u => u.id === id);
        if (userToDelete?.username === 'admin') {
          console.warn('Cannot delete permanent admin user');
          return state;
        }
        return { users: state.users.filter(u => u.id !== id) };
      }),
    }),
    {
      name: 'guru-auth-storage',
      migrate: (persistedState: any, version: number) => {
        if (persistedState && persistedState.users) {
          persistedState.users = persistedState.users.map((u: any) => 
            u.username === 'admin' && u.password === 'admin' 
              ? { ...u, password: 'admin123' } 
              : u
          );
        }
        return persistedState;
      },
    }
  )
);
