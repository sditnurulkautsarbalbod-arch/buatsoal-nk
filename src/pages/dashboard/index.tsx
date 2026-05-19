import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useAdminStore } from '@/store/useAdminStore';
import { Card } from '@/components/ui/Card';
import { FileText, Users, Download, PlusCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { drafts, deleteDraftFromVercel } = useDraftStore();
  const { options } = useAdminStore();
  const isAdmin = user?.role === 'admin';
  const { users } = useAuthStore();
  
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDraftFromVercel(deleteId);
      setDeleteId(null);
      toast.success('Draft berhasil dihapus dari sistem');
    }
  };

  const adminStats = [
    { label: 'Total Guru', value: users.filter(u => u.role === 'guru').length.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Total Soal', value: drafts.length.toString(), icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'PDF Dicetak', value: drafts.length > 0 ? (drafts.length * 2).toString() : '0', icon: Download, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Mapel Aktif', value: options.mataPelajaran.length.toString(), icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Selamat datang, {user?.nama}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isAdmin ? 'Ringkasan aktivitas sekolah hari ini.' : 'Mari buat soal ujian yang berkualitas hari ini.'}
          </p>
        </div>
        
        {!isAdmin && (
          <Link to="/editor">
            <Button className="w-full md:w-auto shadow-sm">
              <PlusCircle className="w-5 h-5 mr-2" />
              Buat Soal Baru
            </Button>
          </Link>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {adminStats.map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center transition-colors">
               <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${stat.bg} ${stat.color} dark:bg-opacity-20`}>
                  <stat.icon className="w-6 h-6" />
               </div>
               <span className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
               <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
          <h2 className="font-semibold text-slate-900 dark:text-white">Dokumen Terbaru Saya</h2>
          <Link to="/editor" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Tulis Baru
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {drafts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">Anda belum memiliki draft soal.</div>
          ) : (
            drafts.map((draft) => (
              <div key={draft.id} className="p-4 px-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{draft.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Diperbarui: {draft.updatedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                    Draft Lokal
                  </span>
                  <Link to={`/editor?id=${draft.id}`}>
                    <Button variant="ghost" size="sm" className="dark:text-slate-300 dark:hover:bg-slate-800">Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteId(draft.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Draft Soal"
        message="Apakah Anda yakin ingin menghapus draft soal ini? Tindakan ini tidak dapat dibatalkan."
      />
      
    </div>
  );
}
