import { useAuthStore } from '@/store/useAuthStore';
import { useDraftStore } from '@/store/useDraftStore';
import { Card } from '@/components/ui/Card'; // Will create this
import { FileText, Users, Download, PlusCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { drafts, deleteDraft } = useDraftStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Selamat datang, {user?.nama}!
          </h1>
          <p className="text-slate-500">
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

      {isAdmin ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Guru', value: '24', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
            { label: 'Total Soal', value: '1,420', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'PDF Dicetak', value: '356', icon: Download, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Mapel Aktif', value: '12', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
               <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
               </div>
               <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
               <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
           {/* Guru Stats */}
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Soal Dibuat</p>
                <p className="text-3xl font-bold text-slate-900">42</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Download className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">PDF Unduhan</p>
                <p className="text-3xl font-bold text-slate-900">18</p>
              </div>
           </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-semibold text-slate-900">Dokumen Terbaru Saya</h2>
          <Link to="/editor" className="text-sm text-indigo-600 font-medium hover:underline">
            Tulis Baru
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {drafts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Anda belum memiliki draft soal.</div>
          ) : (
            drafts.map((draft) => (
              <div key={draft.id} className="p-4 px-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{draft.title}</h3>
                    <p className="text-xs text-slate-500">Diperbarui: {draft.updatedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto">
                  <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Draft Lokal
                  </span>
                  <Link to={`/editor?id=${draft.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                     if(window.confirm('Yakin hapus draft ini?')) deleteDraft(draft.id);
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}
