import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Filter, Plus, FileText, MoreVertical, FileDown, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const initialBankSoal = [
  { id: '1', mapel: 'Matematika', bab: 'Pecahan', kelas: '4', jenis: 'Pilihan Ganda', tingkat: 'Sedang', date: '21 Okt 2023', question: 'Sebuah semangka dibagi menjadi 8 bagian sama besar...' },
  { id: '2', mapel: 'IPA', bab: 'Tumbuhan', kelas: '6', jenis: 'HOTS', tingkat: 'Sulit', date: '15 Okt 2023', question: 'Perhatikan gambar berikut. Fungsi bagian X adalah...' },
  { id: '3', mapel: 'Bahasa Indonesia', bab: 'Puisi', kelas: '5', jenis: 'Isian Singkat', tingkat: 'Mudah', date: '10 Okt 2023', question: 'Gagasan utama pada paragraf di atas terletak pada...' },
  { id: '4', mapel: 'Matematika', bab: 'Bangun Ruang', kelas: '6', jenis: 'Uraian', tingkat: 'Sulit', date: '01 Okt 2023', question: 'Hitunglah volume bangun ruang gabungan di bawah ini!' },
];

export default function BankSoalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [soalList, setSoalList] = useState(initialBankSoal);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const duplicateSoal = (id: string) => {
    const soal = soalList.find(s => s.id === id);
    if (soal) {
      const newSoal = { ...soal, id: Date.now().toString(), date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) };
      setSoalList([newSoal, ...soalList]);
    }
    setActiveMenu(null);
  };

  const deleteSoal = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
      setSoalList(soalList.filter(s => s.id !== id));
    }
    setActiveMenu(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bank Soal Digital
          </h1>
          <p className="text-slate-500">
            Kelola dan cari ribuan soal dari berbagai mata pelajaran.
          </p>
        </div>
        
        <Link to="/editor">
          <Button className="w-full md:w-auto shadow-sm">
            <Plus className="w-5 h-5 mr-2" />
            Soal Baru
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Cari berdasarkan kata kunci, mapel, atau bab..." 
              className="pl-12 bg-slate-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 md:w-auto bg-slate-50 border-slate-200">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
            <Button variant="outline" className="flex-1 md:w-auto bg-slate-50 border-slate-200">
              <FileDown className="w-4 h-4 mr-2" /> Ekspor Kisi
            </Button>
            <Button variant="outline" className="flex-1 md:w-auto bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={() => window.print()}>
              <FileDown className="w-4 h-4 mr-2" /> Cetak PDF
            </Button>
          </div>
        </div>

        {/* Filter Chips - Mock */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['Semua Kelas', 'Kelas 6', 'Matematika', 'HOTS', 'Pilihan Ganda'].map(filter => (
             <span key={filter} className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium cursor-pointer hover:bg-slate-200">
               {filter}
             </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {soalList.filter(s => s.question.toLowerCase().includes(searchTerm.toLowerCase()) || s.mapel.toLowerCase().includes(searchTerm.toLowerCase())).map((soal) => (
          <Card key={soal.id} className="p-4 md:p-6 hover:shadow-md transition-shadow group flex flex-col md:flex-row gap-4 relative">
             <div className="md:w-64 shrink-0 flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">{soal.mapel}</span>
                     <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">KL. {soal.kelas}</span>
                   </div>
                   <h3 className="text-sm font-semibold text-slate-900">{soal.bab}</h3>
                   <p className="text-xs text-slate-500 mt-1">{soal.jenis} • {soal.tingkat}</p>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-4 md:mt-0 flex items-center">
                  <BookOpen className="w-3 h-3 mr-1" /> Ditambahkan {soal.date}
                </div>
             </div>
             
             <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 relative">
                 <p className="text-sm text-slate-700 line-clamp-3 md:line-clamp-none pr-8">
                   {soal.question}
                 </p>
                 
                 <div className="absolute right-0 top-0 md:top-auto">
                   <button 
                     onClick={() => setActiveMenu(activeMenu === soal.id ? null : soal.id)}
                     className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100"
                   >
                     <MoreVertical className="w-5 h-5" />
                   </button>
                   {activeMenu === soal.id && (
                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-10">
                       <Link to="/editor" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Soal</Link>
                       <button onClick={() => duplicateSoal(soal.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Duplikat</button>
                       <button onClick={() => deleteSoal(soal.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Hapus</button>
                     </div>
                   )}
                 </div>
             </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
