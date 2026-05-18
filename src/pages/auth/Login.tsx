import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api/client';
import { Eye, EyeOff, BookOpen } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // MOCK LOGIN FOR DEVELOPMENT PREVIEW
    // Jika VITE_GAS_API_URL kosong atau masih placeholder, kita gunakan mock login.
    const isMock = !import.meta.env.VITE_GAS_API_URL || import.meta.env.VITE_GAS_API_URL === '';

    try {
      if (isMock) {
        // Simulasi network delay
        await new Promise(r => setTimeout(r, 1000));
        
        if (username === 'admin' && password === 'admin') {
          login(
            { id: '1', nama: 'Admin Sekolah', username: 'admin', role: 'admin' },
            'mock-token-admin'
          );
          navigate('/', { replace: true });
          return;
        } else if (username === 'guru' && password === 'guru') {
          login(
            { id: '2', nama: 'Budi Santoso, S.Pd', username: 'guru', role: 'guru' },
            'mock-token-guru'
          );
          navigate('/', { replace: true });
          return;
        } else {
          throw new Error('Gunakan admin/admin atau guru/guru untuk demonstrasi.');
        }
      }

      // API ASLI KE GAS
      const res = await apiClient.post('', { 
        action: 'login', 
        data: { username, password } 
      });

      if (res.data.token) {
        login(res.data.user, res.data.token);
        navigate('/', { replace: true });
      } else {
        setError(res.data.error || 'Login gagal.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-indigo-200 mb-6">
            E
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">EduScript Pro</h2>
          <p className="mt-2 text-sm text-indigo-600 font-medium tracking-wider uppercase">
            Enterprise Grade v4.0
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">
                Username / NIP
              </label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-lg" isLoading={isLoading}>
            Masuk
          </Button>
          
          <div className="text-center mt-4">
            <p className="text-xs text-slate-400">
              Versi Demo: Gunakan <strong className="text-slate-500">guru</strong> / <strong className="text-slate-500">guru</strong>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
