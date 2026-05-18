import { useState } from 'react';
import { useAuthStore, User } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Trash2, Edit2, UserPlus, Shield, X, Check } from 'lucide-react';

export default function UserManagement() {
  const { users, addUser, editUser, deleteUser } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    password: '',
    role: 'guru' as any
  });

  const handleAdd = () => {
    if (!formData.nama || !formData.username || !formData.password) return;
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      nama: formData.nama,
      username: formData.username,
      password: formData.password,
      role: formData.role
    };
    
    addUser(newUser);
    setIsAdding(false);
    resetForm();
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      nama: user.nama,
      username: user.username,
      password: user.password || '',
      role: user.role
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    editUser(editingId, formData);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nama: '', username: '', password: '', role: 'guru' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Manajemen Pengguna</h2>
        <Button onClick={() => setIsAdding(true)} size="sm">
          <UserPlus className="w-4 h-4 mr-2" /> Tambah User
        </Button>
      </div>

      {(isAdding || editingId) && (
        <Card className="p-4 border-indigo-100 bg-indigo-50/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-indigo-900">
              {editingId ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nama Lengkap</label>
              <Input 
                value={formData.nama} 
                onChange={e => setFormData({...formData, nama: e.target.value})} 
                placeholder="Nama Lengkap"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
              <Input 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                placeholder="Username"
                disabled={editingId !== null && formData.username === 'admin'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
              <Input 
                type="password"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                placeholder="Password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
              <select 
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
                disabled={editingId !== null && formData.username === 'admin'}
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="guru">Guru</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); }}>Batal</Button>
            <Button onClick={editingId ? handleSaveEdit : handleAdd}>
              {editingId ? 'Simpan Perubahan' : 'Tambah User'}
            </Button>
          </div>
        </Card>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Username</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{u.nama}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                    u.role === 'operator' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button 
                    onClick={() => handleEdit(u)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Edit User"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {u.username !== 'admin' && (
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Hapus User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {u.username === 'admin' && (
                    <span className="inline-block p-1.5 text-slate-300 cursor-not-allowed" title="Admin Utama tidak bisa dihapus">
                      <Shield className="w-4 h-4" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
