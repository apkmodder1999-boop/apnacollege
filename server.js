import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { getTopicData } from './notes-content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// API: Structured Note Data
app.get('/api/pdf/data', (req, res) => {
  const title = req.query.title || 'Course Notes';
  const data = getTopicData(title);
  res.json({ title, ...data });
});

// API: Generate and Download/Stream Real PDF
app.get('/api/pdf/download', (req, res) => {
  const title = (req.query.title || 'Apna_College_Notes').toString();
  const batch = (req.query.batch || 'Apna College Batch').toString();
  const isSave = req.query.action === 'save' || req.query.download === '1';
  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Notes';
  const data = getTopicData(title);

  res.setHeader('Content-Type', 'application/pdf');
  const disposition = isSave ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeTitle.replace(/\s+/g, '_')}.pdf"`);

  const doc = new PDFDocument({
    margin: 45,
    size: 'A4',
    info: {
      Title: `${title} — Apna College Notes`,
      Author: 'Apna College',
      Subject: data.category || 'Study Material'
    }
  });

  doc.pipe(res);

  // Background and Header Branding
  doc.rect(0, 0, doc.page.width, 10).fill('#eab308');

  doc.moveDown(0.8);
  doc.fontSize(10).fillColor('#ca8a04').font('Helvetica-Bold').text('✦ APNA COLLEGE — OFFICIAL STUDY MATERIAL', { characterSpacing: 1 });
  doc.fontSize(8).fillColor('#6b7280').font('Helvetica').text(`BATCH: ${batch.toUpperCase()}`, { characterSpacing: 0.5 });
  doc.moveDown(0.5);

  // Document Title
  doc.fontSize(22).fillColor('#111827').font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#4b5563').font('Helvetica').text(data.summary || 'Comprehensive lecture notes and technical interview preparation.');
  doc.moveDown(0.8);

  // Divider
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(45, doc.y).lineTo(doc.page.width - 45, doc.y).stroke();
  doc.moveDown(1);

  // Sections
  (data.sections || []).forEach((sec) => {
    // Check page overflow
    if (doc.y > doc.page.height - 120) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 10).fill('#eab308');
      doc.moveDown(1);
    }

    doc.fontSize(13).fillColor('#854d0e').font('Helvetica-Bold').text(sec.title);
    doc.moveDown(0.4);
    doc.fontSize(9.5).fillColor('#374151').font('Helvetica').text(sec.body, { lineGap: 3 });
    doc.moveDown(0.6);

    if (sec.code) {
      if (doc.y > doc.page.height - 140) doc.addPage();
      
      const codeY = doc.y;
      doc.rect(45, codeY, doc.page.width - 90, 80).fill('#18181b');
      doc.fillColor('#38bdf8').fontSize(8.5).font('Courier').text(sec.code, 55, codeY + 8, {
        width: doc.page.width - 110,
        lineGap: 2
      });
      doc.y = codeY + 90;
      doc.moveDown(0.6);
    }
  });

  // Interview Questions
  if (data.interviewQuestions && data.interviewQuestions.length) {
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 10).fill('#eab308');
      doc.moveDown(1);
    }

    doc.fontSize(13).fillColor('#854d0e').font('Helvetica-Bold').text('✦ Technical Interview Questions & Key Solutions');
    doc.moveDown(0.5);

    data.interviewQuestions.forEach((q, idx) => {
      doc.fontSize(9.5).fillColor('#1f2937').font('Helvetica-Bold').text(`Q${idx + 1}: ${q.q}`);
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#4b5563').font('Helvetica').text(`Answer: ${q.a}`, { lineGap: 2 });
      doc.moveDown(0.6);
    });
  }

  // Footer on all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#9ca3af').font('Helvetica').text(
      `Apna College • Page ${i + 1} of ${range.count} • Free Student Access`,
      45,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 90 }
    );
  }

  doc.end();
});

// Serve static assets from the current directory
app.use(express.static(__dirname));

// Route any other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
