import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
  type FileChild,
} from 'docx';
import type { EditorHeaderState, PdfSettings, Question } from '@/store/useEditorStore';

type ExportPayload = {
  header: EditorHeaderState;
  questions: Question[];
  pdfSettings: PdfSettings;
};

const QUESTION_TYPES = ['pg', 'isian', 'uraian'] as const;

const TYPE_LABELS: Record<(typeof QUESTION_TYPES)[number], string> = {
  pg: 'I. PILIHAN GANDA',
  isian: 'II. ISIAN',
  uraian: 'III. URAIAN',
};

const TYPE_INSTRUCTIONS: Record<(typeof QUESTION_TYPES)[number], string> = {
  pg: 'Pilihlah jawaban yang paling tepat!',
  isian: 'Isilah titik-titik di bawah ini dengan jawaban yang tepat!',
  uraian: 'Jawablah pertanyaan-pertanyaan di bawah ini dengan jelas dan benar!',
};

const CM_TO_TWIP = 567;

function toTwipFromCm(value: string, fallbackCm: number) {
  const parsed = parseFloat(String(value).replace(',', '.'));
  const cm = Number.isFinite(parsed) ? parsed : fallbackCm;
  return Math.round(cm * CM_TO_TWIP);
}

function pageSizeTwip(paperSize: string, orientation: string) {
  const base = paperSize === 'A4'
    ? { width: Math.round(21 * CM_TO_TWIP), height: Math.round(29.7 * CM_TO_TWIP) }
    : { width: Math.round(21 * CM_TO_TWIP), height: Math.round(33 * CM_TO_TWIP) };

  if (orientation === 'Landscape') {
    return { width: base.height, height: base.width };
  }

  return base;
}

function makeLine() {
  return new Paragraph({
    children: [new TextRun(' ')],
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        color: '000000',
        size: 6,
        space: 1,
      },
    },
    spacing: { after: 180 },
  });
}

function getOptionById(options: Array<{ id: string; text: string }>, id: string) {
  return options.find((opt) => String(opt.id || '').toUpperCase() === id);
}

function makeOptionCell(text: string, fontFamily: string, size: number) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, font: fontFamily, size })],
        spacing: { after: 40 },
      }),
    ],
  });
}

function sanitizeFileName(raw: string) {
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || `soal-${new Date().toISOString().slice(0, 10)}`;
}

function buildParagraphs(payload: ExportPayload) {
  const { header, questions, pdfSettings } = payload;
  const fontSizeHalfPoint = pdfSettings.fontSize === '11 pt' ? 22 : 24;
  const fontFamily = pdfSettings.fontFamily || 'Times New Roman';

  const lines: FileChild[] = [];

  if (header.foundationName) {
    lines.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: header.foundationName, bold: true, font: fontFamily, size: fontSizeHalfPoint })],
      spacing: { after: 60 },
    }));
  }

  lines.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: header.schoolName || 'NAMA SEKOLAH', bold: true, font: fontFamily, size: fontSizeHalfPoint + 2 })],
    spacing: { after: 80 },
  }));

  if (header.schoolAddress) {
    lines.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: header.schoolAddress, font: fontFamily, size: fontSizeHalfPoint })],
      spacing: { after: 40 },
    }));
  }

  if (header.schoolContact) {
    lines.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: header.schoolContact, font: fontFamily, size: fontSizeHalfPoint })],
      spacing: { after: 160 },
    }));
  }

  lines.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: header.judulUjian || 'JUDUL UJIAN', bold: true, font: fontFamily, size: fontSizeHalfPoint + 2 })],
    spacing: { after: 50 },
  }));

  lines.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `TAHUN AJARAN ${header.tahunAjaran || '-'}`, bold: true, font: fontFamily, size: fontSizeHalfPoint + 1 })],
    spacing: { after: 180 },
  }));

  lines.push(new Paragraph({
    children: [new TextRun({ text: `Mata Pelajaran: ${header.mataPelajaran || '-'}`, font: fontFamily, size: fontSizeHalfPoint })],
    spacing: { after: 60 },
  }));

  lines.push(new Paragraph({
    children: [new TextRun({ text: `Kelas: ${header.kelas || '-'}    Waktu: ${header.waktu || '-'}`, font: fontFamily, size: fontSizeHalfPoint })],
    spacing: { after: 60 },
  }));

  lines.push(new Paragraph({
    children: [new TextRun({ text: 'Nama: ______________________________', font: fontFamily, size: fontSizeHalfPoint })],
    spacing: { after: 240 },
  }));

  for (const type of QUESTION_TYPES) {
    const items = questions.filter((q) => q.type === type);
    if (items.length === 0) continue;

    lines.push(new Paragraph({
      children: [new TextRun({ text: TYPE_LABELS[type], bold: true, font: fontFamily, size: fontSizeHalfPoint })],
      spacing: { before: 140, after: 60 },
    }));

    lines.push(new Paragraph({
      children: [new TextRun({ text: TYPE_INSTRUCTIONS[type], bold: true, font: fontFamily, size: fontSizeHalfPoint })],
      spacing: { after: 120 },
    }));

    items.forEach((q, index) => {
      lines.push(new Paragraph({
        children: [new TextRun({ text: `${index + 1}. ${q.text || `Soal ${index + 1}`}`, font: fontFamily, size: fontSizeHalfPoint })],
        spacing: { after: 80 },
      }));

      if (q.imageUrl) {
        lines.push(new Paragraph({
          children: [new TextRun({ text: '[Gambar tersedia di preview aplikasi]', italics: true, font: fontFamily, size: fontSizeHalfPoint - 1 })],
          spacing: { after: 80 },
        }));
      }

      if (q.type === 'pg' && q.options?.length) {
        const options = q.options as Array<{ id: string; text: string }>;
        const maxOptionLength = Math.max(...options.map((opt) => String(opt.text || '').length), 0);
        const isTwoColumns = maxOptionLength >= 20 && maxOptionLength < 45;

        if (isTwoColumns) {
          const ordered = ['A', 'C', 'B', 'D']
            .map((id) => getOptionById(options, id))
            .filter((opt): opt is { id: string; text: string } => Boolean(opt));

          lines.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            rows: [
              new TableRow({
                children: [
                  makeOptionCell(`${ordered[0]?.id || 'A'}. ${ordered[0]?.text || '-'}`, fontFamily, fontSizeHalfPoint),
                  makeOptionCell(`${ordered[1]?.id || 'C'}. ${ordered[1]?.text || '-'}`, fontFamily, fontSizeHalfPoint),
                ],
              }),
              new TableRow({
                children: [
                  makeOptionCell(`${ordered[2]?.id || 'B'}. ${ordered[2]?.text || '-'}`, fontFamily, fontSizeHalfPoint),
                  makeOptionCell(`${ordered[3]?.id || 'D'}. ${ordered[3]?.text || '-'}`, fontFamily, fontSizeHalfPoint),
                ],
              }),
            ],
          }));
        } else {
          options.forEach((opt) => {
            lines.push(new Paragraph({
              children: [new TextRun({ text: `${opt.id}. ${opt.text || '-'}`, font: fontFamily, size: fontSizeHalfPoint })],
              indent: { left: 360 },
              spacing: { after: 40 },
            }));
          });
        }
      }

      if (q.type === 'isian' || q.type === 'uraian') {
        lines.push(makeLine());
        lines.push(makeLine());
        if (q.type === 'uraian') {
          lines.push(makeLine());
          lines.push(makeLine());
        }
      }

      lines.push(new Paragraph({ spacing: { after: 80 } }));
    });
  }

  return lines;
}

export async function buildDocxBlob(payload: ExportPayload): Promise<Blob> {
  const size = pageSizeTwip(payload.pdfSettings.paperSize, payload.pdfSettings.orientation);

  const section: ISectionOptions = {
    properties: {
      page: {
        margin: {
          top: toTwipFromCm(payload.pdfSettings.marginTop, 1.5),
          right: toTwipFromCm(payload.pdfSettings.marginRight, 1.5),
          bottom: toTwipFromCm(payload.pdfSettings.marginBottom, 1.5),
          left: toTwipFromCm(payload.pdfSettings.marginLeft, 1.5),
        },
        size: {
          width: size.width,
          height: size.height,
        },
      },
    },
    children: buildParagraphs(payload),
  };

  const doc = new Document({ sections: [section] });
  return Packer.toBlob(doc);
}

export async function downloadQuestionsAsDocx(payload: ExportPayload) {
  const blob = await buildDocxBlob(payload);
  const baseName = sanitizeFileName(payload.header.judulUjian || 'soal-ujian');
  const fileName = `${baseName}.docx`;
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
