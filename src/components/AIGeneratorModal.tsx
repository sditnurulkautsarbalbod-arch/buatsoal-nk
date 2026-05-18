import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useEditorStore } from '@/store/useEditorStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Sparkles, X, Loader2, Key, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIGeneratorModal({ isOpen, onClose }: AIGeneratorModalProps) {
  const [topic, setTopic] = useState('');
  const [counts, setCounts] = useState({
    pg: 3,
    pg_kompleks: 0,
    bs: 0,
    jodohkan: 0,
    isian: 0,
    uraian: 0,
    hots: 0,
    gambar: 0,
    tabel: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const { header, addQuestion } = useEditorStore();
  const { geminiApiKey } = useSettingsStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!geminiApiKey) {
      setError('MISSING_API_KEY');
      return;
    }

    if (!topic.trim()) {
      setError('Masukkan topik materi!');
      return;
    }
    
    const totalQuestions = counts.pg + counts.pg_kompleks + counts.bs + counts.jodohkan + counts.isian + counts.uraian + counts.hots + counts.gambar + counts.tabel;
    if (totalQuestions === 0 || isNaN(totalQuestions)) {
      setError('Pilih minimal 1 soal untuk dibuat!');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `Buatkan ${totalQuestions} soal ${header.mataPelajaran} tingkat ${header.kelas} tentang topik "${topic}". 
      Komposisi jenis soal:
      ${counts.pg > 0 ? `- ${counts.pg} soal Pilihan Ganda (type: "pg")\n` : ''}${counts.pg_kompleks > 0 ? `- ${counts.pg_kompleks} soal Pilihan Ganda Kompleks (type: "pg_kompleks")\n` : ''}${counts.bs > 0 ? `- ${counts.bs} soal Benar/Salah (type: "bs")\n` : ''}${counts.jodohkan > 0 ? `- ${counts.jodohkan} soal Menjodohkan (type: "jodohkan")\n` : ''}${counts.isian > 0 ? `- ${counts.isian} soal Isian (type: "isian")\n` : ''}${counts.uraian > 0 ? `- ${counts.uraian} soal Uraian (type: "uraian")\n` : ''}${counts.hots > 0 ? `- ${counts.hots} soal HOTS (type: "hots")\n` : ''}${counts.gambar > 0 ? `- ${counts.gambar} soal dengan konteks Gambar (type: "gambar")\n` : ''}${counts.tabel > 0 ? `- ${counts.tabel} soal dengan konteks Tabel (type: "tabel")\n` : ''}
      Format hasilnya dalam JSON array flat dengan struktur object di bawah ini. Harap beri "type" berupa string persis seperti referensi di atas:
      [
        {
          "type": "pg", // ganti sesuai tipe soal yang diminta
          "text": "Pertanyaan soal...",
          "options": [ // WAJIB ada jika type="pg", "pg_kompleks", atau "bs". Jika "isian" atau "uraian", hilangkan field options.
             // Untuk "pg" atau "pg_kompleks" formatnya:
             {"id": "A", "text": "Pilihan A"}, 
             {"id": "B", "text": "Pilihan B"}, 
             {"id": "C", "text": "Pilihan C"}, 
             {"id": "D", "text": "Pilihan D"}
             // JIKA "bs" Wajib isi array options: [{"id": "Benar", "text": "Benar"}, {"id": "Salah", "text": "Salah"}]
          ],
          "correctAnswer": "A", // Sesuaikan correctAnswer. Jika pg/pg_kompleks isi misal "A", atau "A, C" pakai koma.
          "pembahasan": "Pembahasan singkat"
        }
      ]
      Kembalikan HANYA array JSON yang valid tanpa backticks markdown atau teks tambahan. Pastikan jawabannya relevan dengan materi sekolah tingkat ${header.kelas}.`;

      // Depending on the version of google gen ai sdk
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedQuestions = JSON.parse(cleanJson);
      
      if (!Array.isArray(generatedQuestions)) {
        throw new Error('Invalid format returned by AI');
      }

      generatedQuestions.forEach(q => {
        useEditorStore.setState(state => ({
           questions: [
             ...state.questions,
             {
               id: Date.now().toString() + Math.random().toString(36).substring(7),
               type: q.type || 'pg',
               text: q.text,
               options: q.options || [],
               correctAnswer: q.correctAnswer || 'A',
               bobot: 1,
               tingkatKesulitan: 'Sedang',
               pembahasan: q.pembahasan || ''
             }
           ]
        }));
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Gagal membuat soal. ' + (err.message || ''));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-lg text-slate-800">Buat Soal dengan AI</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            AI akan membuat soal otomatis berdasarkan mata pelajaran (<span className="font-medium text-slate-800">{header.mataPelajaran}</span>) dan kelas (<span className="font-medium text-slate-800">{header.kelas}</span>) yang saat ini dipilih.
          </p>
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Topik / Sub Materi</label>
            <input 
              autoFocus
              className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              placeholder="Contoh: Pecahan Campuran, Sistem Tata Surya, dll"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-semibold text-slate-700">Komposisi Jumlah Soal</label>
             <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto overflow-x-hidden p-1">
                {[
                  { id: 'pg', label: 'PG' },
                  { id: 'pg_kompleks', label: 'PG Kompleks' },
                  { id: 'bs', label: 'Benar/Salah' },
                  { id: 'jodohkan', label: 'Jodohkan' },
                  { id: 'isian', label: 'Isian' },
                  { id: 'uraian', label: 'Uraian' },
                  { id: 'hots', label: 'HOTS' },
                  { id: 'gambar', label: 'Gambar' },
                  { id: 'tabel', label: 'Tabel' },
                ].map((item) => (
                  <div key={item.id} className="space-y-1 text-center">
                     <label className="text-[10px] font-medium text-slate-500 line-clamp-1" title={item.label}>{item.label}</label>
                     <input type="number" min="0" max="20" className="w-full text-center text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 disabled:bg-slate-50" value={(counts as any)[item.id]} onChange={e => setCounts({...counts, [item.id]: parseInt(e.target.value) || 0})} disabled={isGenerating} />
                  </div>
                ))}
             </div>
          </div>
          
          {error === 'MISSING_API_KEY' ? (
             <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-xl font-medium border border-amber-100">
                <p className="mb-3">Anda belum menyimpan <b>Gemini API Key</b>.</p>
                <Button 
                  onClick={() => {
                    onClose();
                    navigate('/pengaturan');
                  }} 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" /> Buka Pengaturan
                </Button>
             </div>
          ) : error ? (
             <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                {error}
             </div>
          ) : null}
        </div>
        
        <div className="p-5 pt-0 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isGenerating}>Batal</Button>
          <Button 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all" 
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sedang Membuat...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Soal</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
