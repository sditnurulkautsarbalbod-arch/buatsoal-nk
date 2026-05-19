import React, { useState } from 'react';
import axios from 'axios';
import { useEditorStore } from '@/store/useEditorStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Sparkles, X, Loader2, Key, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';

function extractJsonArray(text: string) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI tidak mengembalikan JSON array yang valid.');
  }
  const sliced = cleaned.slice(start, end + 1);
  return JSON.parse(sliced);
}

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIGeneratorModal({ isOpen, onClose }: AIGeneratorModalProps) {
  const [topic, setTopic] = useState('');
  const [counts, setCounts] = useState({
    pg: 5,
    isian: 0,
    uraian: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const { header, addQuestion } = useEditorStore();
  const { geminiApiKey } = useSettingsStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Masukkan topik materi!');
      return;
    }
    
    const totalQuestions = counts.pg + counts.isian + counts.uraian;
    if (totalQuestions === 0 || isNaN(totalQuestions)) {
      setError('Pilih minimal 1 soal untuk dibuat!');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const prompt = `Buatkan ${totalQuestions} soal ${header.mataPelajaran} tingkat ${header.kelas} tentang topik "${topic}". 
      Komposisi jenis soal:
      ${counts.pg > 0 ? `- ${counts.pg} soal Pilihan Ganda (type: "pg")\n` : ''}${counts.isian > 0 ? `- ${counts.isian} soal Isian (type: "isian")\n` : ''}${counts.uraian > 0 ? `- ${counts.uraian} soal Uraian (type: "uraian")\n` : ''}
      
      Format hasilnya dalam JSON array flat dengan struktur object di bawah ini.
      
      [
        {
          "type": "pg", // "pg", "isian", atau "uraian"
          "text": "Pertanyaan soal...",
          "options": [ // WAJIB ada jika type="pg". Jika "isian" atau "uraian", hilangkan field options.
             // Untuk "pg" formatnya:
             {"id": "A", "text": "Pilihan A"}, 
             {"id": "B", "text": "Pilihan B"}, 
             {"id": "C", "text": "Pilihan C"}, 
             {"id": "D", "text": "Pilihan D"}
          ],
          "pembahasan": "Penjelasan detail tentang materi ini"
        }
      ]
      
      Kembalikan HANYA array JSON yang valid tanpa backticks markdown atau teks tambahan. Pastikan jawabannya akurat dan relevan dengan kurikulum SD kelas ${header.kelas}.`;

      const generateUrl = new URL('/api/generate', window.location.origin).toString();
      const response = await axios.post(generateUrl, {
        prompt,
        apiKey: geminiApiKey
      });
      const text = response.data.text || '';
      const generatedQuestions = extractJsonArray(text);

      if (!Array.isArray(generatedQuestions)) {
        throw new Error('Format jawaban AI tidak valid (bukan array).');
      }

      generatedQuestions.forEach(q => {
        addQuestion(q.type || 'pg', {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          text: q.text,
          options: q.options || [],
          bobot: 1,
          tingkatKesulitan: 'Sedang',
          pembahasan: q.pembahasan || ''
        });
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
             <div className="grid grid-cols-3 gap-4 p-1">
                {[
                  { id: 'pg', label: 'PG' },
                  { id: 'isian', label: 'Isian' },
                  { id: 'uraian', label: 'Uraian' },
                ].map((item) => (
                  <div key={item.id} className="space-y-1.5 text-center">
                     <label className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1" title={item.label}>{item.label}</label>
                     <input 
                       type="number" 
                       min="0" 
                       max="40" 
                       className="w-full text-center text-base font-medium py-2.5 border-2 border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all disabled:bg-slate-50" 
                       value={(counts as any)[item.id]} 
                       onChange={e => setCounts({...counts, [item.id]: parseInt(e.target.value) || 0})} 
                       disabled={isGenerating} 
                     />
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
