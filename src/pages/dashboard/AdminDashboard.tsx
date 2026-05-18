import { useState } from 'react';
import { useAuthStore, User } from '@/store/useAuthStore';
import { useAdminStore, HeaderOptions } from '@/store/useAdminStore';
import { useDraftStore } from '@/store/useDraftStore';
import { 
  Users, 
  Settings as SettingsIcon, 
  ListOrdered, 
  Database, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Download, 
  Upload as UploadIcon,
  Search,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

type TabType = 'users' | 'headers' | 'settings' | 'drafts' | 'backup';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [activeField, setActiveField] = useState<keyof HeaderOptions | null>(null);
  const { users, addUser, editUser, deleteUser } = useAuthStore();
  const { options, addOption, editOption, deleteOption, defaultLogos, setDefaultLogos, defaultSchoolInfo, setDefaultSchoolInfo } = useAdminStore();
  const { drafts, deleteDraft } = useDraftStore();

  /* Local States for Forms */
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ nama: '', username: '', password: '', role: 'guru' as User['role'] });
  
  const [newOptionValue, setNewOptionValue] = useState('');

  const handleAddUser = () => {
    if (!newUser.nama || !newUser.username || !newUser.password) {
      toast.error('Semua field harus diisi');
      return;
    }
    addUser({
      id: Date.now().toString(),
      ...newUser
    });
    setNewUser({ nama: '', username: '', password: '', role: 'guru' });
    toast.success('User berhasil ditambah');
  };

  const handleExportBackup = () => {
    const backupData = {
      users: useAuthStore.getState().users,
      adminOptions: useAdminStore.getState().options,
      adminLogos: useAdminStore.getState().defaultLogos,
      drafts: useDraftStore.getState().drafts
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_eduscript_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('Backup berhasil diunduh');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.users) useAuthStore.setState({ users: data.users });
        if (data.adminOptions) useAdminStore.setState({ options: data.adminOptions });
        if (data.adminLogos) useAdminStore.setState({ defaultLogos: data.adminLogos });
        if (data.drafts) useDraftStore.setState({ drafts: data.drafts });
        toast.success('Data berhasil dimuat dari backup');
      } catch (err) {
        toast.error('Gagal memproses file backup');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm">Kelola pengguna, pengaturan global, dan data sistem.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        {[
          { id: 'users', label: 'Pengguna', icon: Users },
          { id: 'headers', label: 'Header Dropdown', icon: ListOrdered },
          { id: 'settings', label: 'Pengaturan Global', icon: SettingsIcon },
          { id: 'drafts', label: 'Seluruh Soal', icon: FileText },
          { id: 'backup', label: 'Backup & Restore', icon: Database },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]">
        {activeTab === 'users' && (
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Input placeholder="Nama Lengkap" value={newUser.nama} onChange={e => setNewUser({...newUser, nama: e.target.value})} />
              <Input placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              <Input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-sm"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                >
                  <option value="admin">Admin</option>
                  <option value="guru">Guru</option>
                  <option value="operator">Operator</option>
                </select>
                <Button onClick={handleAddUser} className="h-10 px-4"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nama</th>
                    <th className="px-6 py-4 font-semibold">Username</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{u.nama}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{u.username}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => deleteUser(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="p-6 grid lg:grid-cols-2 gap-8">
            {(Object.keys(options) as (keyof HeaderOptions)[]).map(field => (
              <div key={field} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 capitalize">{field.replace(/([A-Z])/g, ' $1')}</h3>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder={`Tambah ${field}...`} 
                    value={activeField === field ? newOptionValue : ''} 
                    onChange={e => {
                      setActiveField(field);
                      setNewOptionValue(e.target.value);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleAddOption(field)}
                  />
                  <Button onClick={() => handleAddOption(field)} size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="bg-slate-50 rounded-2xl p-2 min-h-[200px] border border-slate-100 space-y-1">
                  {options[field].map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 group">
                      <span className="text-sm text-slate-700">{opt}</span>
                      <button onClick={() => deleteOption(field, idx)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-8 space-y-8 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-2">Identitas Sekolah (Default)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Nama Yayasan</label>
                    <Input value={defaultSchoolInfo.yayasan} onChange={e => setDefaultSchoolInfo({ yayasan: e.target.value })} placeholder="Contoh: YAYASAN PENDIDIKAN..." />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Nama Sekolah</label>
                    <Input value={defaultSchoolInfo.namaSekolah} onChange={e => setDefaultSchoolInfo({ namaSekolah: e.target.value })} placeholder="Contoh: SD IT NURUL KAUTSAR" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Alamat</label>
                    <Input value={defaultSchoolInfo.alamat} onChange={e => setDefaultSchoolInfo({ alamat: e.target.value })} placeholder="Contoh: Jl. Andi Mangerangi No. 47" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Kontak / Keterangan Tambahan</label>
                    <Input value={defaultSchoolInfo.kontak} onChange={e => setDefaultSchoolInfo({ kontak: e.target.value })} placeholder="Contoh: Telp. 0823... I Email: ..." />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-2">Logo KOP Surat (Default)</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-slate-500 block">Logo Kiri (URL)</label>
                    <div className="flex gap-4">
                      <Input value={defaultLogos.left} onChange={e => setDefaultLogos(e.target.value, defaultLogos.right)} placeholder="https://..." />
                      <div className="w-12 h-12 border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                        {defaultLogos.left && <img src={defaultLogos.left} className="w-full h-full object-contain" alt="Preview" />}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-semibold text-slate-500 block">Logo Kanan (URL)</label>
                    <div className="flex gap-4">
                      <Input value={defaultLogos.right} onChange={e => setDefaultLogos(defaultLogos.left, e.target.value)} placeholder="https://..." />
                      <div className="w-12 h-12 border rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                        {defaultLogos.right && <img src={defaultLogos.right} className="w-full h-full object-contain" alt="Preview" />}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                   <p className="text-xs text-amber-700 leading-relaxed">
                     <strong>Tips:</strong> Gunakan fitur upload logo di <em>Editor Soal</em> terlebih dahulu untuk mendapatkan URL gambarnya, lalu salin URL tersebut ke sini untuk menjadikannya logo default bagi semua user.
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="p-6">
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Judul Soal</th>
                    <th className="px-6 py-4 font-semibold">Terakhir Diupdate</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drafts.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{d.title}</p>
                        <p className="text-[10px] text-slate-400">ID: {d.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{d.updatedAt}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => window.open(`/editor?id=${d.id}`, '_blank')}>Buka</Button>
                           <button onClick={() => deleteDraft(d.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {drafts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">Belum ada soal/draft yang dibuat.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 border-2 border-dashed border-slate-100 m-8 rounded-3xl">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
              <Database className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Manajemen Basis Data</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">Simpan seluruh state aplikasi ke dalam file JSON atau muat data dari backup sebelumnya.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleExportBackup} className="h-12 px-8 rounded-2xl gap-2 text-base shadow-lg shadow-indigo-100">
                <Download className="w-5 h-5" />
                Unduh Backup
              </Button>
              <div className="relative">
                <input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Button variant="outline" className="h-12 px-8 rounded-2xl gap-2 text-base border-slate-200">
                  <UploadIcon className="w-5 h-5" />
                  Muar Backup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* Helper functions within component because index state is needed */
  function handleAddOption(field: keyof HeaderOptions) {
    if (!newOptionValue.trim()) return;
    addOption(field, newOptionValue.trim());
    setNewOptionValue('');
    toast.success(`${field} berhasil ditambah`);
  }
}
