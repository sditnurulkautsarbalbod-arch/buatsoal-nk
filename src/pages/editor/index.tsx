import React, { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Check, MoreVertical, Image as ImageIcon, ChevronDown, Maximize2, Minimize2, Trash2, ListTodo, AlignLeft, FileText, X, Save, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { AIGeneratorModal } from '@/components/AIGeneratorModal';
import { vercelService } from '@/services/vercelService';

export default function EditorPage() {
  const { header, setHeaderField, questions, addQuestion, updateQuestion, updateOption, deleteQuestion } = useEditorStore();
  const { drafts, saveDraft } = useDraftStore();
  const { options } = useAdminStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get('id');
  const { defaultLogos, defaultSchoolInfo } = useAdminStore();

  useEffect(() => {
    if (!draftId) {
      if (!header.logoLeft && defaultLogos.left) setHeaderField('logoLeft', defaultLogos.left);
      if (!header.logoRight && defaultLogos.right) setHeaderField('logoRight', defaultLogos.right);
      if (!header.foundationName) setHeaderField('foundationName', defaultSchoolInfo.yayasan);
      if (!header.schoolName) setHeaderField('schoolName', defaultSchoolInfo.namaSekolah);
      if (!header.schoolAddress) setHeaderField('schoolAddress', defaultSchoolInfo.alamat);
      if (!header.schoolContact) setHeaderField('schoolContact', defaultSchoolInfo.kontak);
    }
  }, [draftId, defaultLogos, defaultSchoolInfo]);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [imageModalConfig, setImageModalConfig] = useState<{ isOpen: boolean, tempUrl: string, questionId: string, widthCm: number, heightCm: number } | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const questionTypes = ['pg', 'isian', 'uraian'] as const;
  type QuestionType = typeof questionTypes[number];

  const typeLabels: Record<QuestionType, string> = {
    pg: 'I. PILIHAN GANDA',
    isian: 'II. ISIAN',
    uraian: 'III. URAIAN',
  };

  const typeInstructions: Record<QuestionType, string> = {
    pg: 'Pilihlah jawaban yang paling tepat!',
    isian: 'Isilah titik-titik di bawah ini dengan jawaban yang tepat!',
    uraian: 'Jawablah pertanyaan-pertanyaan di bawah ini dengan jelas dan benar!',
  };

  const groupsByType = questionTypes.map((type) => ({
    type,
    items: questions.filter((q) => q.type === type),
  }));

  useEffect(() => {
    if (draftId) {
      const existing = drafts.find((d) => d.id === draftId);
      if (existing && existing.editorState) {
        useEditorStore.setState(existing.editorState);
      }
    }
  }, [draftId]);

  const handleSaveDraft = async () => {
    const id = draftId || Date.now().toString();
    const draftData = {
      id,
      title: header.judulUjian || 'Draft Soal',
      content: '',
      updatedAt: new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      editorState: useEditorStore.getState(),
    };

    setIsSaving(true);
    try {
      saveDraft(draftData);

      await vercelService.query(
        `
        INSERT INTO drafts (id, title, content, updatedAt, editorState)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          updatedAt = EXCLUDED.updatedAt,
          editorState = EXCLUDED.editorState
      `,
        [id, draftData.title, draftData.content, draftData.updatedAt, JSON.stringify(draftData.editorState)],
      );

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

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, position: 'logoLeft' | 'logoRight') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Memproses logo...');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setHeaderField(position, dataUrl);
      toast.success('Logo berhasil dipasang!', { id: toastId });
    } catch (err) {
      toast.error('Gagal memproses logo.', { id: toastId });
    }
  };

  const handleSaveToBankSoal = async () => {
    if (questions.length === 0) {
      toast.error('Belum ada soal untuk disimpan ke bank soal.');
      return;
    }

    setIsSavingToBank(true);
    const toastId = toast.loading('Menyimpan ke bank soal...');

    try {
      const createdAt = new Date().toISOString();
      for (const q of questions) {
        const questionText = (q.text || '').trim();
        if (!questionText) continue;

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await vercelService.query(
          `INSERT INTO bank_soal (id, question, jenis, mapel, kelas, tingkat, pembahasan, options_json, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            questionText,
            q.type,
            header.mataPelajaran || '',
            header.kelas || '',
            q.tingkatKesulitan || 'Sedang',
            q.pembahasan || '',
            JSON.stringify(q.options || []),
            createdAt,
          ],
        );
      }

      toast.success('Soal berhasil disimpan ke bank soal!', { id: toastId });
    } catch (err: any) {
      console.error('Save to bank soal failed:', err);
      toast.error(`Gagal menyimpan ke bank soal: ${err?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsSavingToBank(false);
    }
  };

  const handleResetDocument = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sanitizeFileNamePart = (value: string) =>
    (value || '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

  const buildDocFileName = () => {
    const kelas = sanitizeFileNamePart(header.kelas || 'Kelas');
    const mapel = sanitizeFileNamePart(header.mataPelajaran || 'Mata Pelajaran');
    const judul = sanitizeFileNamePart(header.judulUjian || 'Dokumen Soal');
    return `${kelas} - ${mapel} - ${judul}.doc`;
  };

  const handleExportWord = () => {
    const content = document.getElementById('module-content')?.innerHTML;
    if (!content) {
      toast.error('Konten dokumen belum tersedia.');
      return;
    }

    const documentTitle = header.judulUjian || 'Dokumen Soal';
    const fileName = buildDocFileName();

    const preHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${documentTitle}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.15;
            color: #000000;
          }
          h2 { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0; color: #000000; text-align: center; }
          h3 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0; color: #000000; text-align: center; }
          p { margin: 0 0 8px 0; line-height: 1.15; color: #000000; }
          ol { margin: 0; padding-left: 22px; }
          li { margin-bottom: 8px; }
          img { max-width: 100%; height: auto; }
          .doc-header-title { text-align: center; margin-bottom: 20px; }
          .doc-main-title { font-size: 15pt; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
          .doc-subtitle { font-size: 13pt; font-weight: 700; text-transform: uppercase; margin-bottom: 0; }
          .doc-meta { margin-bottom: 18px; }
          .section-title { font-size: 12pt; font-weight: 700; margin: 0 0 6px 0; border-bottom: 1px solid #000000; padding-bottom: 2px; }
          .section-instruction { font-weight: 700; margin: 0 0 10px 0; }
          .doc-question { margin-bottom: 6px; text-align: justify; white-space: pre-wrap; }
          .answer-line { border-bottom: 1px solid #000000; min-height: 1.15rem; margin-bottom: 6px; }
        </style>
      </head>
      <body>
    `;
    const postHtml = '</body></html>';
    const html = preHtml + content + postHtml;

    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);

    const nav = navigator as any;
    if (nav.msSaveOrOpenBlob) {
      nav.msSaveOrOpenBlob(blob, fileName);
    } else {
      downloadLink.href = url;
      downloadLink.download = fileName;
      downloadLink.click();
    }

    document.body.removeChild(downloadLink);
  };


  return (
    <div className="flex flex-col h-full bg-[#F1F5F9] dark:bg-slate-950 font-sans transition-colors duration-300">
      <style>
        {`
          @media print {
            .no-print, nav, footer, button {
              display: none !important;
            }
            @page {
              margin: 1.5cm;
              size: A4;
            }
            #module-content {
              width: 100% !important;
              padding: 0 !important;
              max-width: none !important;
              margin: 0 !important;
              font-family: 'Times New Roman', serif !important;
              font-size: 11pt !important;
              line-height: 1.15 !important;
              color: #000000 !important;
            }
            .print-content {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: auto !important;
              overflow: visible !important;
            }
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

          #module-content {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.15;
            color: #000000;
          }

          #module-content .doc-header-title {
            text-align: center;
            margin-bottom: 1.8rem;
          }

          #module-content .doc-main-title {
            font-size: 15pt;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 0.25rem;
            letter-spacing: 0.01em;
          }

          #module-content .doc-subtitle {
            font-size: 13pt;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 0;
            letter-spacing: 0.01em;
          }

          #module-content .doc-meta {
            margin-bottom: 1.7rem;
          }

          #module-content .doc-meta p,
          #module-content ol,
          #module-content li,
          #module-content .doc-question {
            font-size: 11pt;
            line-height: 1.15;
            color: #000000;
          }

          #module-content .section-title {
            font-size: 12pt;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 0.35rem;
            border-bottom: 1px solid #000000;
            padding-bottom: 0.2rem;
            letter-spacing: 0.01em;
          }

          #module-content .section-instruction {
            font-weight: 700;
            margin-bottom: 0.75rem;
          }

          #module-content .answer-line {
            border-bottom: 1px solid #000000;
            min-height: 1.15rem;
            margin-bottom: 0.4rem;
          }
        `}
      </style>

      {!isFullscreen && (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sticky top-0 z-20 shrink-0 print:hidden transition-colors">
          <div className="flex md:flex items-center gap-4 w-1/3">
            <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate">{header.judulUjian || 'Contoh Soal Matematika'}</h1>
            <button onClick={handleSaveDraft} disabled={isSaving} className="flex items-center gap-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 text-xs font-medium bg-green-50 dark:bg-green-900/10 px-2 py-1 rounded shrink-0 transition-colors disabled:opacity-50">
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
          </div>

          <div className="hidden md:flex items-center justify-center space-x-8 flex-1 text-slate-800 dark:text-slate-200 font-semibold py-5">Editor Soal</div>

          <div className="flex items-center justify-end gap-4 w-1/3">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={`https://ui-avatars.com/api/?name=${user?.nama || 'Bu Sari'}&background=random`} alt="Avatar" className="w-8 h-8 rounded-full" />
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-none">{user?.nama || 'Bu Sari'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
        <div className={`w-full xl:w-[45%] shrink-0 flex flex-col bg-slate-50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 overflow-y-auto print:hidden transition-all duration-300 ${isFullscreen ? 'hidden xl:hidden' : 'block'}`}>
          <div className="p-4 md:p-6 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-white">Header Soal</h3>
                <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
              </div>

              <div className="flex items-stretch border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 relative gap-3">
                <div className="w-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 relative hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer overflow-hidden">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoLeft')} />
                  {header.logoLeft ? <img src={header.logoLeft} alt="Logo Kiri" className="w-full h-full object-contain p-1" /> : <><ImageIcon className="w-6 h-6 text-slate-400 mb-1" /><span className="text-[10px] text-slate-500 font-medium">Logo Kiri</span></>}
                  {header.logoLeft && <span className="absolute bottom-1 text-[8px] text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-1 rounded z-20 cursor-pointer pointer-events-none">Hapus</span>}
                </div>

                <div className="flex-1 flex flex-col justify-center items-center gap-1.5 font-sans">
                  <input className="text-[11px] font-bold text-center w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors uppercase text-slate-900 dark:text-white" value={header.foundationName} onChange={(e) => setHeaderField('foundationName', e.target.value)} placeholder="Nama Yayasan" />
                  <input className="text-sm font-bold text-center w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors uppercase text-slate-900 dark:text-white" value={header.schoolName} onChange={(e) => setHeaderField('schoolName', e.target.value)} placeholder="Nama Sekolah" />
                  <textarea className="text-[10px] text-center w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors text-slate-600 dark:text-slate-400 resize-none overflow-hidden" value={header.schoolAddress} onChange={(e) => setHeaderField('schoolAddress', e.target.value)} placeholder="Alamat Sekolah" rows={1} />
                  <input className="text-[10px] text-center w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 rounded px-1 transition-colors text-slate-600 dark:text-slate-400" value={header.schoolContact} onChange={(e) => setHeaderField('schoolContact', e.target.value)} placeholder="Kontak & Email Sekolah" />
                </div>

                <div className="w-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 relative hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer overflow-hidden">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" accept="image/*" onChange={(e) => handleLogoUpload(e, 'logoRight')} />
                  {header.logoRight ? <img src={header.logoRight} alt="Logo Kanan" className="w-full h-full object-contain p-1" /> : <><ImageIcon className="w-6 h-6 text-slate-400 mb-1" /><span className="text-[10px] text-slate-500 font-medium">Logo Kanan</span></>}
                  {header.logoRight && <span className="absolute bottom-1 text-[8px] text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-1 rounded z-20 cursor-pointer pointer-events-none">Hapus</span>}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Header Soal</label>
                  <div className="relative">
                    <select className="w-full appearance-none text-sm p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 outline-none transition-all pr-8 text-slate-700 dark:text-slate-200" value={header.judulUjian} onChange={(e) => setHeaderField('judulUjian', e.target.value)}>
                      <option value="">-- Pilih Header --</option>
                      {options.judulUjian.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Mata Pelajaran</label>
                  <div className="relative">
                    <select className="w-full appearance-none text-sm p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 outline-none transition-all pr-8 text-slate-700 dark:text-slate-200" value={header.mataPelajaran} onChange={(e) => setHeaderField('mataPelajaran', e.target.value)}>
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {options.mataPelajaran.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Kelas</label>
                  <div className="relative">
                    <select className="w-full appearance-none text-sm p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 outline-none transition-all pr-8 text-slate-700 dark:text-slate-200" value={header.kelas} onChange={(e) => setHeaderField('kelas', e.target.value)}>
                      <option value="">-- Pilih Kelas --</option>
                      {options.kelas.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Tahun Ajaran</label>
                  <div className="relative">
                    <select className="w-full appearance-none text-sm p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 outline-none transition-all pr-8 text-slate-700 dark:text-slate-200" value={header.tahunAjaran} onChange={(e) => setHeaderField('tahunAjaran', e.target.value)}>
                      <option value="">-- Pilih Tahun Ajaran --</option>
                      {options.tahunAjaran.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Waktu</label>
                  <div className="relative">
                    <select className="w-full appearance-none text-sm p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 outline-none transition-all pr-8 text-slate-700 dark:text-slate-200" value={header.waktu} onChange={(e) => setHeaderField('waktu', e.target.value)}>
                      <option value="">-- Pilih Waktu --</option>
                      {options.waktu.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Editor Soal</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((_, index) => (
                  <button key={index} onClick={() => setActiveQuestionIndex(index)} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold transition-colors ${activeQuestionIndex === index ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    {index + 1}
                  </button>
                ))}
                {questions.length === 0 && <div className="text-sm text-slate-500 italic">Belum ada soal. Silakan tambah komponen soal.</div>}
              </div>
            </div>

            {questions.length > 0 && (
              <div className="space-y-4 pb-12 mt-4">
                {[questions[activeQuestionIndex]].filter(Boolean).map((q) => {
                  const index = activeQuestionIndex;
                  return (
                    <div key={q.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                        <button className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none uppercase">
                          {index + 1}. {q.type.replace('_', ' ')}
                        </button>
                        <button onClick={() => {
                          if (window.confirm('Hapus soal ini?')) {
                            deleteQuestion(q.id);
                            toast.success('Soal berhasil dihapus');
                          }
                        }} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-5 space-y-5">
                        <div className="relative">
                          <textarea rows={2} className="w-full text-sm p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 outline-none resize-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200" placeholder="Tuliskan soal di sini..." value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} />
                          <div className="mt-3">
                            {q.imageUrl ? (
                              <div className="relative inline-block group">
                                <img src={q.imageUrl} alt="Lampiran Soal" style={{ width: q.imageWidth ? `${q.imageWidth}cm` : 'auto', height: q.imageHeight ? `${q.imageHeight}cm` : 'auto' }} className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700" />
                                <button onClick={() => updateQuestion(q.id, { imageUrl: undefined, imageWidth: undefined, imageHeight: undefined })} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow-sm z-10">
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
                                      const toastId = toast.loading('Memproses gambar...');
                                      try {
                                        const dataUrl = await readFileAsDataUrl(file);
                                        setImageModalConfig({ isOpen: true, tempUrl: dataUrl, questionId: q.id, widthCm: 10, heightCm: 10 });
                                        toast.success('Gambar berhasil dipasang!', { id: toastId });
                                      } catch (err) {
                                        toast.error('Gagal memproses gambar.', { id: toastId });
                                      }
                                    }
                                  }}
                                />
                                <label htmlFor={`img-upload-${q.id}`} className="cursor-pointer flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800">
                                  <ImageIcon className="w-4 h-4" />
                                  Tambahkan Gambar
                                </label>
                              </div>
                            )}
                          </div>
                        </div>

                        {q.type === 'pg' && q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, oIdx) => (
                              <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 w-4">{opt.id}.</span>
                                <input className="text-sm bg-transparent border-none flex-1 focus:ring-0 p-0 text-slate-700 dark:text-slate-200 font-medium focus:outline-none" value={opt.text} onChange={(e) => updateOption(q.id, oIdx, e.target.value)} placeholder={`Opsi ${opt.id}`} />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2">
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Pembahasan <span className="font-normal">(Opsional)</span></label>
                          <input className="w-full text-sm p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 text-slate-800 dark:text-slate-200" value={q.pembahasan} onChange={(e) => updateQuestion(q.id, { pembahasan: e.target.value })} placeholder="Contoh: 2.456 + 3.789 = 6.245" />
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Soal {index + 1} dari {questions.length}</span>
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
              </div>
            )}
          </div>
        </div>

        <div className={`w-full xl:flex-1 min-h-[70vh] xl:min-h-0 flex flex-col bg-[#eef1f6] dark:bg-slate-950 relative print:bg-white overflow-visible xl:overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] w-full h-full bg-slate-900 overflow-hidden' : ''}`}>
          <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-5 shrink-0 no-print z-20 shadow-sm relative transition-colors ${isFullscreen ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Jenis Komponen Soal</h3>
              <Button size="sm" onClick={() => setIsAIModalOpen(true)} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-none shadow-none font-semibold h-8 rounded-lg gap-2 ring-1 ring-indigo-200 dark:ring-indigo-800">
                <Sparkles className="w-3.5 h-3.5" />
                Buat dengan AI
              </Button>
            </div>
            <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 no-scrollbar">
              {[
                { id: 'pg', label: 'PG', icon: ListTodo },
                { id: 'isian', label: 'Isian', icon: AlignLeft },
                { id: 'uraian', label: 'Uraian', icon: FileText },
              ].map((item) => (
                <button key={item.label} onClick={() => addQuestion(item.id as any)} className="flex-none flex items-center p-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all gap-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 active:scale-95">
                  <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="leading-tight pr-1 whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm z-10 no-print shrink-0 transition-colors ${isFullscreen ? 'sticky top-0' : ''}`}>
            <div className="flex items-center gap-3">
              <button className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${isFullscreen ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-600 dark:text-slate-400'}`} onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {!isFullscreen && (
                <>
                  <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-2"></div>
                  <button className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded transition-colors relative" title="Download DOC" onClick={handleExportWord}>
                    <FileText className="w-4 h-4" />
                    <span className="absolute -bottom-1 -right-2 text-[8px] font-bold bg-blue-600 text-white px-1 rounded leading-none">DOC</span>
                  </button>
                  <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded transition-colors tooltip disabled:opacity-50" title="Simpan ke Bank Soal" onClick={handleSaveToBankSoal} disabled={isSavingToBank}>
                    {isSavingToBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
            <button onClick={handleResetDocument} className="no-print flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke atas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 flex flex-col items-center justify-start no-scrollbar">
            <div className="bg-white rounded shadow-2xl overflow-visible print-content min-h-[29.7cm] relative w-full max-w-[950px]">
              <div id="module-content" className="p-6 md:p-14 leading-[1.15] max-w-[21cm] mx-auto bg-white text-black" style={{ fontFamily: '"Times New Roman", serif', fontSize: '11pt', lineHeight: '1.15' }}>
                <div className="doc-header-title">
                  {header.foundationName && <p className="font-bold uppercase mb-1">{header.foundationName}</p>}
                  <h2 className="doc-main-title">{header.schoolName || 'NAMA SEKOLAH'}</h2>
                  {header.schoolAddress && <p className="mb-1">{header.schoolAddress}</p>}
                  {header.schoolContact && <p>{header.schoolContact}</p>}
                  <div className="border-b-2 border-black mt-3" />
                </div>

                <div className="text-center mb-7">
                  <h3 className="doc-subtitle">{header.judulUjian || 'JUDUL UJIAN'}</h3>
                  <p className="font-bold uppercase">TAHUN AJARAN {header.tahunAjaran || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-10 doc-meta">
                  <div className="space-y-1">
                    <p><span className="inline-block w-32">Mata Pelajaran</span>: {header.mataPelajaran || '-'}</p>
                    <p><span className="inline-block w-32">Kelas</span>: {header.kelas || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="inline-block w-20">Nama</span>: _____________________</p>
                    <p><span className="inline-block w-20">Waktu</span>: {header.waktu || '-'}</p>
                  </div>
                </div>

                {groupsByType.map(({ type, items: group }) => {
                  if (!group.length) return null;
                  return (
                    <div key={type} className="mb-7">
                      <p className="section-title">{typeLabels[type]}</p>
                      <p className="section-instruction">{typeInstructions[type]}</p>
                      <ol className="list-decimal pl-6 space-y-4">
                        {group.map((q, idx) => {
                          const maxOptionLength = Math.max(...((q.options || []).map((o: any) => String(o.text || '').length)), 0);
                          const isTwoColumns = maxOptionLength >= 20 && maxOptionLength < 45;
                          const reorderedOptions = isTwoColumns
                            ? ['A', 'C', 'B', 'D'].map((id) => q.options?.find((opt: any) => opt.id === id)).filter(Boolean) as Array<{ id: string; text: string }>
                            : (q.options || []);

                          return (
                            <li key={q.id} value={idx + 1}>
                              <p className="doc-question whitespace-pre-wrap text-justify mb-2">{q.text || `Soal ${idx + 1}`}</p>
                              {q.imageUrl && <img src={q.imageUrl} alt="Lampiran" style={{ width: q.imageWidth ? `${q.imageWidth}cm` : 'auto', height: q.imageHeight ? `${q.imageHeight}cm` : 'auto' }} className="max-w-full object-contain border border-slate-200 p-1 rounded-sm mb-3" />}
                              {q.type === 'pg' && reorderedOptions.length > 0 && (
                                <div className={`grid gap-2 mb-2 ${maxOptionLength < 20 ? 'grid-cols-4' : isTwoColumns ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {reorderedOptions.map((opt: any) => (
                                    <div key={opt.id} className="flex gap-1">
                                      <span className="font-semibold w-5 shrink-0">{opt.id}.</span>
                                      <span>{opt.text || '-'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(q.type === 'isian' || q.type === 'uraian') && (
                                <div>
                                  <div className="answer-line" />
                                  <div className="answer-line" />
                                  {q.type === 'uraian' && (
                                    <>
                                      <div className="answer-line" />
                                      <div className="answer-line" />
                                    </>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  <input type="number" className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm" value={imageModalConfig.widthCm} onChange={(e) => setImageModalConfig({ ...imageModalConfig, widthCm: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Panjang/Tinggi (cm)</label>
                  <input type="number" className="w-full text-[13px] p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm" value={imageModalConfig.heightCm} onChange={(e) => setImageModalConfig({ ...imageModalConfig, heightCm: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <p className="text-xs text-slate-500 border border-blue-100 bg-blue-50 p-3 rounded-lg"><strong className="text-blue-700 block mb-1">Tips:</strong> Sesuaikan panjang dan lebar agar tercetak sempurna pada lembar soal. Kosongkan nilai (atau isi 0) untuk ukuran otomatis (auto). Satuan Centimeter (cm).</p>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button onClick={() => setImageModalConfig(null)} variant="outline" className="text-slate-600 bg-white shadow-sm border-slate-200">Batal</Button>
              <Button onClick={() => {
                updateQuestion(imageModalConfig.questionId, { imageUrl: imageModalConfig.tempUrl, imageWidth: imageModalConfig.widthCm, imageHeight: imageModalConfig.heightCm });
                setImageModalConfig(null);
              }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm gap-2">
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
