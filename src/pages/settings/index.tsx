import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Shield, Bell, Save, Sparkles, Key, Check, Users as UsersIcon, Database } from 'lucide-react';
import UserManagement from './Users';
import { cloudflareService } from '@/services/cloudflareService';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { geminiApiKey, setGeminiApiKey } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'profil' | 'ai' | 'users'>('profil');
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [isSaved, setIsSaved] = useState(false);
  const [isDbInitializing, setIsDbInitializing] = useState(false);

  const handleSaveAIKey = () => {
    setGeminiApiKey(apiKeyInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleInitDatabase = async () => {
    setIsDbInitializing(true);
    try {
      await cloudflareService.initSchema();
      alert('Database D1 berhasil diinisialisasi dan Admin Utama telah dibuat.');
    } catch (err: any) {
      alert('Gagal inisialisasi: ' + err.message);
    } finally {
      setIsDbInitializing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengaturan Sistem</h1>
          <p className="text-slate-500">Kelola profil, keamanan, dan preferensi aplikasi Anda.</p>
        </div>
        {user?.role === 'admin' && (
          <Button variant="outline" size="sm" onClick={handleInitDatabase} isLoading={isDbInitializing}>
            <Database className="w-4 h-4 mr-2" /> Init D1
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
           <button 
             onClick={() => setActiveTab('profil')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'profil' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
           >
              <User className={`w-5 h-5 ${activeTab === 'profil' ? 'text-indigo-600' : 'text-slate-400'}`} /> Profil Pengguna
           </button>
           {user?.role === 'admin' && (
             <button 
               onClick={() => setActiveTab('users')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
             >
                <UsersIcon className={`w-5 h-5 ${activeTab === 'users' ? 'text-indigo-600' : 'text-slate-400'}`} /> Manajemen User
             </button>
           )}
           <button 
             onClick={() => setActiveTab('ai')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
           >
              <Sparkles className={`w-5 h-5 ${activeTab === 'ai' ? 'text-indigo-600' : 'text-slate-400'}`} /> Integrasi AI
           </button>
        </div>

        <div className="md:col-span-2 space-y-6">
           {activeTab === 'profil' && (
             <Card className="p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Informasi Pribadi</h2>
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">Nama Lengkap</label>
                      <Input defaultValue={user?.nama} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">Username / NIP</label>
                      <Input defaultValue={user?.username} disabled className="bg-slate-100 text-slate-500 cursor-not-allowed" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">Peran Akses</label>
                      <Input defaultValue={user?.role.toUpperCase()} disabled className="bg-slate-100 text-slate-500 cursor-not-allowed" />
                   </div>
                   <div className="pt-4 flex justify-end">
                      <Button>
                         <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                      </Button>
                   </div>
                </div>
             </Card>
           )}

           {activeTab === 'users' && user?.role === 'admin' && (
             <UserManagement />
           )}

           {activeTab === 'ai' && (
             <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">Konfigurasi Gemini AI</h2>
                </div>
                <div className="space-y-4">
                   <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                     <p className="mb-2">Untuk menggunakan fitur <b>Buat Soal Otomatis</b>, Anda memerlukan API Key dari Google Gemini.</p>
                     <ul className="list-disc pl-5 space-y-1">
                       <li>Dapatkan API Key secara gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="font-bold underline">Google AI Studio</a>.</li>
                       <li>Kunci API disimpan dengan aman di dalam browser Anda (Local Storage) dan tidak dikirim ke server kami.</li>
                     </ul>
                   </div>
                   
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">Gemini API Key</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="AIzaSy..." 
                          className="pl-9 font-mono"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                        />
                      </div>
                   </div>
                   <div className="pt-4 flex justify-end">
                      <Button onClick={handleSaveAIKey} className={isSaved ? "bg-green-600 hover:bg-green-700" : ""}>
                         {isSaved ? <><Check className="w-4 h-4 mr-2" /> Tersimpan</> : <><Save className="w-4 h-4 mr-2" /> Simpan API Key</>}
                      </Button>
                   </div>
                </div>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
