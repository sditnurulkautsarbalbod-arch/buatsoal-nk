import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Check, MoreVertical, ChevronLeft, Image as ImageIcon, ChevronDown, Plus, Minus, Maximize2, Minimize2, Trash2, ListTodo, AlignLeft, FileText, FileCheck2, Table, Upload, Trello, Menu, Activity, Bell, Search, Download, X, Settings, Printer, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { AIGeneratorModal } from '@/components/AIGeneratorModal';
import { vercelService } from '@/services/vercelService';

export default function EditorPage() {
  const { header, setHeaderField, questions, addQuestion, updateQuestion, updateOption, deleteQuestion, pdfSettings, setPdfSetting } = useEditorStore();
  const { drafts, saveDraft } = useDraftStore();
  const { options } = useAdminStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const draftId = searchParams.get('id');
  const { defaultLogos, defaultSchoolInfo } = useAdminStore();

  useEffect(() => {
    // If not loading a draft (or even if loading a draft but fields are empty), apply admin defaults
    if (!draftId) {
      if (!header.logoLeft && defaultLogos.left) setHeaderField('logoLeft', defaultLogos.left);
      if (!header.logoRight && defaultLogos.right) setHeaderField('logoRight', defaultLogos.right);
      if (!header.foundationName) setHeaderField('foundationName', defaultSchoolInfo.yayasan);
      if (!header.schoolName) setHeaderField('schoolName', defaultSchoolInfo.namaSekolah);
      if (!header.schoolAddress) setHeaderField('schoolAddress', defaultSchoolInfo.alamat);
      if (!header.schoolContact) setHeaderField('schoolContact', defaultSchoolInfo.kontak);
    }
  }, [draftId, defaultLogos, defaultSchoolInfo]);

  const [zoom, setZoom] = useState(100);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPdfSettingsOpen, setIsPdfSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageModalConfig, setImageModalConfig] = useState<{ isOpen: boolean, tempUrl: string, questionId: string, widthCm: number, heightCm: number } | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const prevQuestionsLengthRef = useRef(questions.length);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const docContainerRef = useRef<HTMLDivElement>(null);

  const isLandscape = pdfSettings.orientation === 'Landscape';
  const paperWidthObj = { 'A4': 210, 'F4': 210 };
  const paperHeightObj = { 'A4': 297, 'F4': 330 };
  const wBase = paperWidthObj[pdfSettings.paperSize as keyof typeof paperWidthObj] || 210;
  const hBase = paperHeightObj[pdfSettings.paperSize as keyof typeof paperHeightObj] || 297;
  const docWidth = isLandscape ? hBase : wBase;
  const docHeight = isLandscape ? wBase : hBase;

  // Calculate pages based on total height
  useEffect(() => {
    const updatePagination = () => {
      if (!docContainerRef.current) return;
      const height = docContainerRef.current.getBoundingClientRect().height;
      const pageHeightPx = (docHeight / 25.4) * 96; // convert mm to px at 96dpi
      const count = Math.ceil(height / pageHeightPx);
      setTotalPages(Math.max(1, count));
    };

    const observer = new ResizeObserver(updatePagination);
    if (docContainerRef.current) observer.observe(docContainerRef.current);
    return () => observer.disconnect();
  }, [docHeight, questions, header]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPos = container.scrollTop;
    const pageHeightPx = (docHeight / 25.4) * 96 * (zoom / 100);
    const newPage = Math.floor(scrollPos / (pageHeightPx + 32)) + 1; // 32 is roughly the gap/margin between pages in some views, but here gap is 0
    // Simplified scroll calculation
    const height = container.scrollHeight;
    const page = Math.ceil((scrollPos + container.clientHeight / 2) / (height / totalPages));
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const scrollToPage = (page: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const height = container.scrollHeight;
    const targetScroll = ((page - 1) * height) / totalPages;
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  useEffect(() => {
     if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (draftId) {
      const existing = drafts.find(d => d.id === draftId);
      if (existing && existing.editorState) {
        useEditorStore.setState(existing.editorState);
      }
    }
  }, [draftId]);

  const handleSaveDraft = async () => {
    const id = draftId || Date.now().toString();
    const draftData = {
      id,
      title: header.judulUjian || "Draft Soal",
      content: '', // legacy
      updatedAt: new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute:'2-digit' }),
      editorState: useEditorStore.getState(),
    };

    setIsSaving(true);
    try {
      // Local Sync
      saveDraft(draftData);
      
      // Vercel Postgres Sync
      await vercelService.query(`
        INSERT INTO drafts (id, title, content, updatedAt, editorState)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          updatedAt = EXCLUDED.updatedAt,
          editorState = EXCLUDED.editorState
      `, [id, draftData.title, draftData.content, draftData.updatedAt, JSON.stringify(draftData.editorState)]);

      if (!draftId) {
        setSearchParams({ id });
      }
      toast.success('Draft berhasil disimpan!');
    } catch (err) {
      console.error('Save to Vercel failed:', err);
      toast.error('Gagal menyimpan ke Vercel. Data tersimpan di lokal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: 'logoLeft' | 'logoRight') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const toastId = toast.loading('Mengunggah logo ke Vercel Blob...');
      try {
        const url = await vercelService.uploadToBlob(file);
        setHeaderField(position, url);
        toast.success('Logo berhasil diunggah!', { id: toastId });
      } catch (err) {
        toast.error('Gagal mengunggah logo.', { id: toastId });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePrint = () => {
    toast.success('Mempersiapkan PDF...', {
      description: 'Dialog cetak/download akan segera terbuka.'
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] font-sans">
      <style>
        {`
          @media print {
            @page {
              size: ${pdfSettings.paperSize} ${isLandscape ? 'landscape' : 'portrait'};
              margin: 0;
            }
          }
        `}
      </style>
      {/* Top Header */}
      {!isFullscreen && (
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20 shrink-0 print:hidden">
          <div className="flex md:flex items-center gap-4 w-1/3">
             <h1 className="text-lg font-bold text-slate-800 truncate">{header.judulUjian || "Contoh Soal Matematika"}</h1>
             <button onClick={handleSaveDraft} disabled={isSaving} className="flex items-center gap-2 text-green-600 hover:bg-green-100 text-xs font-medium bg-green-50 px-2 py-1 rounded shrink-0 transition-colors disabled:opacity-50">
               {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
               {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
             </button>
          </div>

          {/* Center label (visible on desktop) */}
          <div className="hidden md:flex items-center justify-center space-x-8 flex-1">
             <div className="text-slate-800 font-semibold py-5">Editor Soal</div>
          </div>

          <div className="flex items-center justify-end gap-4 w-1/3">
             <div className="flex items-center gap-2 cursor-pointer">
                <img src={`https://ui-avatars.com/api/?name=${user?.nama || 'Bu Sari'}&background=random`} alt="Avatar" className="w-8 h-8 rounded-full" />
                <div className="hidden md:block text-right">
                   <p className="text-sm font-semibold text-slate-800 leading-none">{user?.nama || 'Bu Sari'}</p>
                   <p className="text-xs text-slate-500">{user?.role === 'admin' ? 'Admin' : 'Guru'}</p>
                </div>
             </div>
          </div>
        </header>
      )}

      {/* Main Content Area: Split 50/50 Desktop */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        
        {/* Left Pane - Editor Form */}
        <div className={`w-full xl:w-[45%] flex flex-col bg-slate-50 border-r border-slate-200 overflow-y-auto print:hidden transition-all duration-300 ${isFullscreen ? 'hidden xl:hidden' : 'block'}`}>
          <div className="p-4 md:p-6 space-y-6">

            
            {/* Header Soal (Kop Surat) Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Header Soal</h3>
                <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
              </div>
              
              <div className="flex items-stretch border border-slate-200 rounded-lg p-3 bg-slate-50 relative gap-3">
                {/* Logo Left */}
                <div className="w-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-white relative hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoLeft')} />
                  {header.logoLeft ? (
                    <img src={header.logoLeft} alt="Logo Kiri" className="w-full h-full object-contain p-1" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500 font-medium">Logo Kiri</span>
                    </>
                  )}
                  {header.logoLeft && <span className="absolute bottom-1 text-[8px] text-blue-600 bg-white/80 px-1 rounded z-20 cursor-pointer pointer-events-none">Hapus</span>}
                </div>

                {/* School Details */}
                <div className="flex-1 flex flex-col justify-center items-center gap-1.5">
                  <input className="text-[11px] font-bold text-center w-full bg-transparent border border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors uppercase" value={header.foundationName} onChange={(e) => setHeaderField('foundationName', e.target.value)} placeholder="Nama Yayasan" />
                  <input className="text-sm font-bold text-center w-full bg-transparent border border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors uppercase" value={header.schoolName} onChange={(e) => setHeaderField('schoolName', e.target.value)} placeholder="Nama Sekolah" />
                  <input className="text-[10px] text-center w-full bg-transparent border border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors" value={header.schoolAddress} onChange={(e) => setHeaderField('schoolAddress', e.target.value)} placeholder="Alamat Sekolah" />
                  <input className="text-[10px] text-center w-full bg-transparent border border-transparent hover:border-slate-300 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors" value={header.schoolContact} onChange={(e) => setHeaderField('schoolContact', e.target.value)} placeholder="Kontak & Email Sekolah" />
                </div>

                {/* Logo Right */}
                <div className="w-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-white relative hover:bg-slate-50 transition-colors cursor-pointer overflow-hidden">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoRight')} />
                  {header.logoRight ? (
                    <img src={header.logoRight} alt="Logo Kanan" className="w-full h-full object-contain p-1" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500 font-medium">Logo Kanan</span>
                    </>
                  )}
                  {header.logoRight && <span className="absolute bottom-1 text-[8px] text-blue-600 bg-white/80 px-1 rounded z-20 cursor-pointer pointer-events-none">Hapus</span>}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Header Soal</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all pr-8"
                      value={header.judulUjian} 
                      onChange={(e) => setHeaderField('judulUjian', e.target.value)}
                    >
                      <option value="">-- Pilih Header --</option>
                      {options.judulUjian.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Mata Pelajaran</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all pr-8"
                      value={header.mataPelajaran} 
                      onChange={(e) => setHeaderField('mataPelajaran', e.target.value)}
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {options.mataPelajaran.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Kelas</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all pr-8"
                      value={header.kelas} 
                      onChange={(e) => setHeaderField('kelas', e.target.value)}
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {options.kelas.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Tahun Ajaran</label>
                  <div className="relative">
                     <select className="w-full appearance-none text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all pr-8" value={header.tahunAjaran} onChange={(e) => setHeaderField('tahunAjaran', e.target.value)}>
                       <option value="">-- Pilih Tahun Ajaran --</option>
                       {options.tahunAjaran.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                     </select>
                     <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Waktu</label>
                  <div className="relative">
                    <select 
                      className="w-full appearance-none text-sm p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all pr-8"
                      value={header.waktu} 
                      onChange={(e) => setHeaderField('waktu', e.target.value)}
                    >
                      <option value="">-- Pilih Waktu --</option>
                      {options.waktu.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">Editor Soal</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                 {questions.map((_, index) => (
                   <button 
                     key={index}
                     onClick={() => setActiveQuestionIndex(index)}
                     className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold transition-colors ${activeQuestionIndex === index ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                   >
                     {index + 1}
                   </button>
                 ))}
                 {questions.length === 0 && <div className="text-sm text-slate-500 italic">Belum ada soal. Silakan tambah komponen soal.</div>}
              </div>
            </div>
            
            {questions.length > 0 && <div className="space-y-4 pb-12 mt-4">
              {[questions[activeQuestionIndex]].filter(Boolean).map((q, _) => {
                const index = activeQuestionIndex;
                return (

                <div key={q.id} className="bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
                    <button className="flex items-center gap-2 text-sm font-semibold text-slate-800 focus:outline-none uppercase">
                       {index + 1}. {q.type.replace('_', ' ')}
                    </button>
                    <button onClick={() => {
                      if (window.confirm('Hapus soal ini?')) {
                        deleteQuestion(q.id);
                        toast.success('Soal berhasil dihapus');
                      }
                    }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-5">
                    {/* Soal Text */}
                    <div className="relative">
                      <textarea 
                        rows={2} 
                        className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none bg-slate-50/50" 
                        placeholder="Tuliskan soal di sini..."
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      />
                      <div className="mt-3">
                        {q.imageUrl ? (
                          <div className="relative inline-block group">
                            <img src={q.imageUrl} alt="Lampiran Soal" style={{ width: q.imageWidth ? `${q.imageWidth}cm` : 'auto', height: q.imageHeight ? `${q.imageHeight}cm` : 'auto' }} className="max-h-40 rounded-lg border border-slate-200" />
                            <button 
                              onClick={() => updateQuestion(q.id, { imageUrl: undefined, imageWidth: undefined, imageHeight: undefined })}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-sm z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <input 
                               type="file" 
                               accept="image/*"
                               id={`img-upload-${q.id}`}
                               className="hidden"
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                   setIsUploading(true);
                                   const toastId = toast.loading('Mengunggah gambar ke Vercel Blob...');
                                   try {
                                      const url = await vercelService.uploadToBlob(file);
                                      setImageModalConfig({ isOpen: true, tempUrl: url, questionId: q.id, widthCm: 10, heightCm: 10 });
                                      toast.success('Gambar berhasil diunggah!', { id: toastId });
                                   } catch (err) {
                                      toast.error('Gagal mengunggah gambar.');
                                      toast.dismiss(toastId);
                                   } finally {
                                      setIsUploading(false);
                                   }
                                 }
                               }}
                             />
                             <label 
                               htmlFor={`img-upload-${q.id}`} 
                               className="cursor-pointer flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-blue-200"
                             >
                                <ImageIcon className="w-4 h-4" />
                                Tambahkan Gambar
                             </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    {(q.type === 'pg') && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, oIdx) => (
                          <div 
                            key={opt.id} 
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300"
                          >
                             <span className="text-sm font-semibold text-slate-400 w-4">{opt.id}.</span>
                             <input 
                               className="text-sm bg-transparent border-none flex-1 focus:ring-0 p-0 text-slate-700 font-medium focus:outline-none" 
                               value={opt.text}
                               onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                               placeholder={`Opsi ${opt.id}`}
                             />
                          </div>
                        ))}
                      </div>
                    )}

                    
                    {/* Pembahasan */}
                    <div className="pt-2">
                      <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Pembahasan <span className="font-normal">(Opsional)</span></label>
                      <input 
                        className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        value={q.pembahasan}
                        onChange={(e) => updateQuestion(q.id, { pembahasan: e.target.value })}
                        placeholder="Contoh: 2.456 + 3.789 = 6.245"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                     <span className="text-xs text-slate-600 font-medium">Soal {index + 1} dari {questions.length}</span>
                     <div className="flex items-center gap-4">
                        <Button onClick={handleSaveDraft} disabled={isSaving} size="sm" className="bg-blue-600 hover:bg-blue-700 shadow flex items-center gap-2 disabled:opacity-50">
                           {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                           {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                     </div>
                  </div>
                </div>
                );
              })}
            </div>}
            
          </div>
        </div>

        {/* Right Pane - Preview & Settings */}
        <div className={`flex-1 flex flex-col bg-[#eef1f6] relative print:bg-white overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] w-full h-full bg-slate-900 overflow-y-auto' : ''}`}>
          
          {/* Tambah Komponen Soal */}
          {(!isFullscreen || true) && ( // keep visible in mobile if needed, but user wants it visible on mobile
            <div className={`bg-white border-b border-slate-200 p-5 shrink-0 print:hidden z-20 shadow-sm relative ${isFullscreen ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-semibold text-slate-800 text-sm">Jenis Komponen Soal</h3>
                 <Button size="sm" onClick={() => setIsAIModalOpen(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-none shadow-none font-semibold h-8 rounded-lg gap-2 ring-1 ring-indigo-200">
                    <Sparkles className="w-3.5 h-3.5" />
                    Buat dengan AI
                 </Button>
              </div>
              <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 no-scrollbar">
                 {[
                   { id:'pg', label:'PG', icon: ListTodo, color: 'text-blue-600' },
                   { id:'isian', label:'Isian', icon: AlignLeft },
                   { id:'uraian', label:'Uraian', icon: FileText },
                 ].map((item, index) => (
                   <button 
                     key={item.label} 
                     onClick={() => addQuestion(item.id as any)}
                     className="flex-none flex items-center p-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all gap-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                   >
                     <div className="p-1.5 rounded bg-slate-100 text-slate-500">
                        <item.icon className="w-4 h-4" />
                     </div>
                     <span className="leading-tight pr-1 whitespace-nowrap">{item.label}</span>
                   </button>
                 ))}
              </div>
            </div>
          )}

          {/* Zoom Toolbar & Pagination */}
          <div className={`h-14 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-10 print:hidden shrink-0 ${isFullscreen ? 'sticky top-0' : ''}`}>
            <div className="flex items-center gap-3">
              <button className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors" onClick={() => setZoom(Math.max(50, zoom - 10))}><Minus className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-slate-700 w-12 text-center select-none">{zoom}%</span>
              <button className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors" onClick={() => setZoom(Math.min(200, zoom + 10))}><Plus className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-slate-300 mx-2"></div>
              <button className={`p-1.5 hover:bg-slate-100 rounded transition-colors ${isFullscreen ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`} onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {!isFullscreen && (
                <>
                  <div className="w-px h-5 bg-slate-300 mx-2"></div>
                  <button className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors tooltip" title="Pengaturan PDF" onClick={() => setIsPdfSettingsOpen(true)}><Settings className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors tooltip" title="Download PDF" onClick={handlePrint}><Download className="w-4 h-4" /></button>
                  <button className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors tooltip" title="Simpan ke Bank Soal" onClick={() => toast.success("Soal berhasil disimpan ke bank soal!")}><Save className="w-4 h-4" /></button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
               {totalPages > 1 && (
                 <>
                   <button 
                      disabled={currentPage <= 1}
                      onClick={() => scrollToPage(currentPage - 1)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors disabled:opacity-50"
                   >
                      <ChevronLeft className="w-4 h-4" />
                   </button>
                   <span className="text-xs font-bold text-slate-700 select-none">Halaman {currentPage} dari {totalPages}</span>
                   <button 
                      disabled={currentPage >= totalPages}
                      onClick={() => scrollToPage(currentPage + 1)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors disabled:opacity-50"
                   >
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                   </button>
                 </>
               )}
               {totalPages <= 1 && <span className="text-xs font-bold text-slate-700 select-none">Tampilan Dokumen</span>}
            </div>
          </div>

          <div 
             ref={scrollContainerRef}
             onScroll={handleScroll}
             className="flex-1 overflow-y-auto w-full p-4 md:p-8 flex flex-col items-center justify-start print:p-0 no-scrollbar gap-0 scroll-smooth"
          >
             
             {/* Document Container - NOW CONTINUOUS */}
             <div 
                ref={docContainerRef}
                className={`bg-white shadow-xl relative transition-transform origin-top print:shadow-none print:m-0 print:block mx-auto ${isFullscreen ? 'scale-100' : ''}`}
                style={{ 
                   width: `${docWidth}mm`,
                   minHeight: `${docHeight}mm`,
                   transform: `scale(${zoom / 100})`,
                   marginBottom: `${((zoom / 100) * docHeight) - docHeight + 50}mm`,
                   position: 'relative'
                }}
             >
                {/* Visual Margins (Dotted lines simulation) */}
                <div className="absolute inset-x-0 border-t border-dashed border-slate-300 pointer-events-none print:hidden flex justify-start pl-8" style={{ top: `${parseFloat(pdfSettings.marginTop) || 1.5}cm` }}>
                   <span className="bg-slate-50 text-[10px] px-1.5 py-0.5 -translate-y-1/2 text-slate-500 absolute font-medium rounded border border-slate-200">{parseFloat(pdfSettings.marginTop) || 1.5} cm</span>
                </div>
                <div className="absolute inset-x-0 border-b border-dashed border-slate-300 pointer-events-none print:hidden flex justify-start pl-8" style={{ bottom: `${parseFloat(pdfSettings.marginBottom) || 1.5}cm` }}>
                   <span className="bg-slate-50 text-[10px] px-1.5 py-0.5 translate-y-1/2 text-slate-500 absolute font-medium rounded border border-slate-200">{parseFloat(pdfSettings.marginBottom) || 1.5} cm</span>
                </div>
                <div className="absolute inset-y-0 border-l border-dashed border-slate-300 pointer-events-none print:hidden flex items-center" style={{ left: `${parseFloat(pdfSettings.marginLeft) || 1.5}cm` }}>
                   <span className="bg-slate-50 text-[10px] px-1.5 py-0.5 -translate-x-1/2 text-slate-500 font-medium rounded border border-slate-200 absolute rotate-[-90deg] whitespace-nowrap">{parseFloat(pdfSettings.marginLeft) || 1.5} cm</span>
                </div>
                <div className="absolute inset-y-0 border-r border-dashed border-slate-300 pointer-events-none print:hidden flex items-center justify-end" style={{ right: `${parseFloat(pdfSettings.marginRight) || 1.5}cm` }}>
                   <span className="bg-slate-50 text-[10px] px-1.5 py-0.5 translate-x-1/2 text-slate-500 font-medium rounded border border-slate-200 absolute rotate-90 whitespace-nowrap">{parseFloat(pdfSettings.marginRight) || 1.5} cm</span>
                </div>

                {/* Page Markers */}
                {Array.from({ length: 20 }).map((_, i) => (
                   <div 
                     key={i} 
                     className="absolute inset-x-0 border-t-2 border-dashed border-slate-200 print:hidden z-[5] pointer-events-none" 
                     style={{ top: `${(i + 1) * docHeight}mm` }}
                   >
                     <div className="absolute left-[-80px] top-[-10px] bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-bold shadow-lg">HALAMAN {i + 2}</div>
                   </div>
                ))}

                {/* Actual Printed Content Area */}
                <div 
                   className="w-full text-black min-h-full flex flex-col"
                   style={{ 
                      paddingTop: `${parseFloat(pdfSettings.marginTop) || 1.5}cm`,
                      paddingBottom: `${parseFloat(pdfSettings.marginBottom) || 1.5}cm`,
                      paddingLeft: `${parseFloat(pdfSettings.marginLeft) || 1.5}cm`,
                      paddingRight: `${parseFloat(pdfSettings.marginRight) || 1.5}cm`,
                      fontFamily: pdfSettings.fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : 'Arial, sans-serif',
                      fontSize: pdfSettings.fontSize === '12 pt' ? '12pt' : '11pt'
                   }}
                >
                       {/* Header Render */}
                       <div className="doc-header">
                         <div className="flex gap-4 border-b-2 border-black pb-4 mb-5 border-double border-b-[3px]">
                            <div className="w-20 lg:w-24 shrink-0 flex items-center justify-center">
                              {header.logoLeft && <img src={header.logoLeft} alt="Logo" className="w-auto h-20 lg:h-24 object-contain" />}
                            </div>
                            <div className="flex-1 text-center flex flex-col justify-center">
                               {header.foundationName && <h4 className="font-bold text-sm lg:text-base uppercase tracking-wide leading-tight">{header.foundationName}</h4>}
                               <h2 className="font-bold text-lg lg:text-xl uppercase tracking-wider">{header.schoolName}</h2>
                               <p className="text-sm leading-snug">{header.schoolAddress}</p>
                               <p className="text-sm leading-snug">{header.schoolContact}</p>
                            </div>
                            <div className="w-20 lg:w-24 shrink-0 flex items-center justify-center">
                              {header.logoRight && <img src={header.logoRight} alt="Logo" className="w-auto h-20 lg:h-24 object-contain" />}
                            </div>
                         </div>
      
                         {/* Title Render */}
                         <div className="text-center mb-8 leading-[1.15]">
                            <h3 className="font-bold text-base lg:text-lg uppercase tracking-wider mb-1">{header.judulUjian || 'JUDUL UJIAN'}</h3>
                            <h3 className="font-bold text-base lg:text-lg uppercase tracking-wider">TAHUN AJARAN {header.tahunAjaran || '20XX/20XX'}</h3>
                         </div>
      
                         {/* Meta Details */}
                         <div className="grid grid-cols-2 max-w-2xl text-justify mb-8 px-4 gap-x-12 leading-[1.15]">
                            <div className="space-y-2">
                               <div className="flex"><span className="w-32 font-medium text-[11pt]">Mata Pelajaran</span><span className="mx-2">:</span><span>{header.mataPelajaran}</span></div>
                               <div className="flex"><span className="w-32 font-medium text-[11pt]">Kelas</span><span className="mx-2">:</span><span>{header.kelas}</span></div>
                            </div>
                            <div className="space-y-2">
                               <div className="flex"><span className="w-24 font-medium text-[11pt]">Nama</span><span className="mx-2">:</span><span className="flex-1 border-b border-black border-dotted mr-4"></span></div>
                               <div className="flex"><span className="w-24 font-medium text-[11pt]">Waktu</span><span className="mx-2">:</span><span>{header.waktu}</span></div>
                            </div>
                         </div>
                       </div>
    
                       {/* Questions Block */}
                       <div className="space-y-6 flex-1 leading-[1.15]">
                         {(['pg', 'isian', 'uraian'] as const).map(type => {
                           const group = questions.filter(q => q.type === type);
                           if (group.length === 0) return null;
                           
                           const typeLabels: Record<string, string> = {
                             'pg': 'I. PILIHAN GANDA',
                             'isian': 'II. ISIAN',
                             'uraian': 'III. URAIAN',
                           };
                           const typeInstructions: Record<string, string> = {
                             'pg': 'Pilihlah jawaban yang paling tepat!',
                             'isian': 'Isilah titik-titik di bawah ini dengan jawaban yang tepat!',
                             'uraian': 'Jawablah pertanyaan-pertanyaan di bawah ini dengan jelas dan benar!',
                           };
                           return (
                             <div key={type} className="mb-0">
                               <h4 className="font-bold mb-4 uppercase tracking-wider">{typeLabels[type]}</h4>
                               <p className="font-bold mb-4 text-[11pt]">{typeInstructions[type]}</p>
                               <ol className="list-decimal pl-6 space-y-5" start={1}>
                                 {group.map((q, idx) => (
                                   <li key={q.id} data-q-id={q.id} className="pl-2 break-inside-auto">
                                     <p className="mb-2.5 whitespace-pre-wrap text-justify text-[11pt]">{q.text || `Soal ${questions.indexOf(q) + 1} (${q.type})`}</p>
                                     {q.imageUrl && <div className="mb-3 mt-3"><img src={q.imageUrl} alt="Lampiran" style={{ width: q.imageWidth ? `${q.imageWidth}cm` : 'auto', height: q.imageHeight ? `${q.imageHeight}cm` : 'auto' }} className="max-w-full object-contain border border-slate-200 p-1 rounded-sm" /></div>}
                                     {(q.type === 'pg') && q.options && (
                                       <div className={`grid gap-2 text-[11pt] ${
                                         Math.max(...(q.options.map(o => o.text.length) || [0])) < 20
                                           ? 'grid-cols-4'
                                           : Math.max(...(q.options.map(o => o.text.length) || [0])) < 45
                                             ? 'grid-cols-2'
                                             : 'grid-cols-1'
                                       }`}>
                                          {q.options.map(opt => (
                                            <div key={opt.id} className="flex gap-1">
                                              <span className="font-semibold w-5 shrink-0 text-left">{opt.id}.</span> <span>{opt.text}</span>
                                            </div>
                                          ))}
                                       </div>
                                     )}
                                     {(q.type === 'isian' || q.type === 'uraian') && (
                                       <div className="mt-4 space-y-4">
                                         <div className="border-b border-dotted border-black w-full h-4"></div>
                                         <div className="border-b border-dotted border-black w-full h-4"></div>
                                         {q.type === 'uraian' && (
                                             <>
                                               <div className="border-b border-dotted border-black w-full h-4"></div>
                                               <div className="border-b border-dotted border-black w-full h-4"></div>
                                             </>
                                         )}
                                       </div>
                                     )}
                                   </li>
                                 ))}
                               </ol>
                             </div>
                           );
                         })}
                       </div>
                </div>
             </div>
          </div>
             
             
          {/* PDF Settings Floating Modal */}
             {isPdfSettingsOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <h3 className="font-bold text-slate-800 text-[16px]">Pengaturan PDF</h3>
                     <button onClick={() => setIsPdfSettingsOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <div className="p-5 space-y-6 overflow-y-auto no-scrollbar flex-1">
                     
                     {/* Ukuran Kertas */}
                     <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-slate-700">Ukuran Kertas</label>
                        <div className="relative">
                           <select 
                             className="w-full appearance-none text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                             value={pdfSettings.paperSize}
                             onChange={(e) => setPdfSetting('paperSize', e.target.value)}
                           >
                              <option value="F4">F4 (21,0 x 33,0 cm)</option>
                              <option value="A4">A4 (21,0 x 29,7 cm)</option>
                           </select>
                           <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     
                     {/* Orientasi */}
                     <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-slate-700">Orientasi</label>
                        <div className="relative">
                           <select 
                             className="w-full appearance-none text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                             value={pdfSettings.orientation}
                             onChange={(e) => setPdfSetting('orientation', e.target.value)}
                           >
                              <option value="Portrait">Portrait</option>
                              <option value="Landscape">Landscape</option>
                           </select>
                           <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>

                     {/* Margin */}
                     <div>
                        <label className="text-[13px] font-medium text-slate-700 mb-2 block">Margin</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                           <div className="space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium">Atas</span>
                              <div className="relative">
                                 <input type="text" className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" value={pdfSettings.marginTop} onChange={(e) => setPdfSetting('marginTop', e.target.value)} />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 bg-transparent pointer-events-none">cm</span>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium">Bawah</span>
                              <div className="relative">
                                 <input type="text" className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" value={pdfSettings.marginBottom} onChange={(e) => setPdfSetting('marginBottom', e.target.value)} />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 bg-transparent pointer-events-none">cm</span>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium">Kiri</span>
                              <div className="relative">
                                 <input type="text" className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" value={pdfSettings.marginLeft} onChange={(e) => setPdfSetting('marginLeft', e.target.value)} />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 bg-transparent pointer-events-none">cm</span>
                              </div>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[11px] text-slate-500 font-medium">Kanan</span>
                              <div className="relative">
                                 <input type="text" className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" value={pdfSettings.marginRight} onChange={(e) => setPdfSetting('marginRight', e.target.value)} />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400 bg-transparent pointer-events-none">cm</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 text-[13px] bg-emerald-50 p-2 rounded-lg border border-emerald-100/50">
                           <Check className="w-4 h-4" /> <span className="font-medium">Semua margin 1.5 cm</span>
                        </div>
                     </div>

                     {/* Font */}
                     <div className="space-y-4">
                        <div>
                           <label className="text-[13px] font-medium text-slate-700 mb-1.5 block">Font</label>
                           <div className="relative">
                              <select 
                                className="w-full appearance-none text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                                value={pdfSettings.fontFamily}
                                onChange={(e) => setPdfSetting('fontFamily', e.target.value)}
                              >
                                 <option value="Times New Roman">Times New Roman</option>
                                 <option value="Arial">Arial</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           </div>
                        </div>
                        
                        <div>
                           <label className="text-[13px] font-medium text-slate-700 mb-1.5 block">Ukuran Font</label>
                           <div className="relative">
                              <select 
                                className="w-full appearance-none text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                                value={pdfSettings.fontSize}
                                onChange={(e) => setPdfSetting('fontSize', e.target.value)}
                              >
                                 <option value="12 pt">12 pt</option>
                                 <option value="11 pt">11 pt</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                           </div>
                        </div>
                     </div>
                     
                  </div>

                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                     <p className="text-[13px] font-medium text-slate-500">Total Halaman: {totalPages}</p>
                     <Button onClick={() => setIsPdfSettingsOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm gap-2">
                        <Check className="w-4 h-4" /> Simpan
                     </Button>
                  </div>
               </div>
             </div>
             )}

          </div>
        </div>
      
      {/* Image Resize Modal */}
      {imageModalConfig?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h3 className="font-bold text-slate-800 text-[16px]">Pengaturan Gambar</h3>
                 <button onClick={() => setImageModalConfig(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-5 space-y-6 overflow-y-auto no-scrollbar flex-1">
                 <div className="flex justify-center bg-slate-100 p-2 rounded-lg overflow-x-auto relative">
                    <img src={imageModalConfig.tempUrl} alt="Preview" style={{ width: imageModalConfig.widthCm > 0 ? `${imageModalConfig.widthCm}cm` : 'auto', height: imageModalConfig.heightCm > 0 ? `${imageModalConfig.heightCm}cm` : 'auto' }} className="object-contain bg-white border border-slate-300 transition-all max-w-full" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Lebar (cm)</label>
                       <input 
                         type="number" 
                         className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                         value={imageModalConfig.widthCm}
                         onChange={(e) => setImageModalConfig({...imageModalConfig, widthCm: parseFloat(e.target.value) || 0})}
                       />
                    </div>
                    <div>
                       <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Panjang/Tinggi (cm)</label>
                       <input 
                         type="number" 
                         className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                         value={imageModalConfig.heightCm}
                         onChange={(e) => setImageModalConfig({...imageModalConfig, heightCm: parseFloat(e.target.value) || 0})}
                       />
                    </div>
                 </div>
                 <p className="text-xs text-slate-500 border border-blue-100 bg-blue-50 p-3 rounded-lg"><strong className="text-blue-700 block mb-1">Tips:</strong> Sesuaikan panjang dan lebar agar tercetak sempurna pada lembar soal. Kosongkan nilai (atau isi 0) untuk ukuran otomatis (auto). Satuan Centimeter (cm).</p>
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                 <Button onClick={() => setImageModalConfig(null)} variant="outline" className="text-slate-600 bg-white shadow-sm border-slate-200">Batal</Button>
                 <Button 
                   onClick={() => {
                     updateQuestion(imageModalConfig.questionId, { imageUrl: imageModalConfig.tempUrl, imageWidth: imageModalConfig.widthCm, imageHeight: imageModalConfig.heightCm });
                     setImageModalConfig(null);
                   }} 
                   className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm gap-2"
                 >
                    <Check className="w-4 h-4" /> Simpan Gambar
                 </Button>
              </div>
           </div>
        </div>
      )}

      <AIGeneratorModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
    </div>
  );
}
