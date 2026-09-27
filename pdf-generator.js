/**
 * Cloudflare Pages Compatible Client-Side PDF Generator
 * Uses PDF-Lib in browser to generate genuine PDF blobs without any backend server.
 */

window.generateClientPDF = async function (title, batchName) {
  if (!window.PDFLib) {
    throw new Error("PDF-Lib not loaded");
  }

  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  // Retrieve topic notes data
  const data = (window.getTopicData ? window.getTopicData(title) : null) || {
    category: "Apna College Course Notes",
    summary: `Comprehensive study notes and practice materials for "${title}" prepared by Apna College.`,
    sections: [
      {
        title: `1. Core Concepts — ${title}`,
        body: `This module covers fundamental concepts, core syntax, problem solving patterns, and interview strategies for ${title}.\n\n• Detailed conceptual breakdown\n• Code patterns & algorithmic optimizations\n• Time and space complexity trade-offs`
      },
      {
        title: "2. Key Highlights & Edge Cases",
        body: "• Always verify edge conditions: null inputs, empty bounds, single-element cases.\n• Analyze time complexity: optimize from O(N^2) to O(N log N) or O(N).\n• Maintain clean, modular code with descriptive variable naming."
      }
    ],
    interviewQuestions: [
      { q: `What is the most frequently tested pattern in ${title}?`, a: "Handling boundary conditions, reducing space complexity, and articulating trade-offs clearly." }
    ]
  };

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  let y = height - 40;

  // Header Brand Accent Bar
  page.drawRectangle({
    x: 0,
    y: height - 10,
    width: width,
    height: 10,
    color: rgb(0.22, 0.74, 0.97) // Sky 400
  });

  // Header Branding
  page.drawText("✦ APNA COLLEGE MOD APK — OFFICIAL STUDY NOTES", {
    x: 45,
    y: y,
    size: 10,
    font: fontBold,
    color: rgb(0.06, 0.65, 0.91)
  });
  y -= 16;

  page.drawText(`BATCH: ${(batchName || "APNA COLLEGE BATCH").toUpperCase()}`, {
    x: 45,
    y: y,
    size: 8,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });
  y -= 24;

  // Title
  const cleanTitle = (title || "Course Notes").slice(0, 48);
  page.drawText(cleanTitle, {
    x: 45,
    y: y,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.15)
  });
  y -= 18;

  // Summary
  const summary = (data.summary || "").slice(0, 110);
  page.drawText(summary, {
    x: 45,
    y: y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4)
  });
  y -= 16;

  // Horizontal Rule
  page.drawLine({
    start: { x: 45, y },
    end: { x: width - 45, y },
    thickness: 1,
    color: rgb(0.88, 0.9, 0.94)
  });
  y -= 25;

  // Sections
  for (const sec of data.sections || []) {
    if (y < 120) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }

    page.drawText(sec.title || "Section", {
      x: 45,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.02, 0.45, 0.75)
    });
    y -= 16;

    // Body lines wrapping
    const rawLines = (sec.body || "").split("\n");
    for (const rawLine of rawLines) {
      const words = rawLine.split(" ");
      let currentLine = "";
      for (const w of words) {
        if ((currentLine + " " + w).length > 78) {
          if (y < 60) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - 50;
          }
          page.drawText(currentLine.trim(), {
            x: 45,
            y,
            size: 9.5,
            font: fontRegular,
            color: rgb(0.2, 0.23, 0.28)
          });
          y -= 14;
          currentLine = w + " ";
        } else {
          currentLine += w + " ";
        }
      }
      if (currentLine.trim()) {
        if (y < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - 50;
        }
        page.drawText(currentLine.trim(), {
          x: 45,
          y,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.2, 0.23, 0.28)
        });
        y -= 14;
      }
    }

    y -= 12;

    // Code snippet box if present
    if (sec.code) {
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      const codeLines = sec.code.split("\n").slice(0, 6);
      page.drawRectangle({
        x: 45,
        y: y - (codeLines.length * 13) - 6,
        width: width - 90,
        height: (codeLines.length * 13) + 12,
        color: rgb(0.06, 0.08, 0.12)
      });
      let codeY = y - 4;
      for (const cl of codeLines) {
        page.drawText(cl.slice(0, 70), {
          x: 55,
          y: codeY,
          size: 8,
          font: fontMono,
          color: rgb(0.22, 0.74, 0.97)
        });
        codeY -= 13;
      }
      y = codeY - 14;
    }
  }

  // Interview Questions
  if (data.interviewQuestions && data.interviewQuestions.length) {
    if (y < 140) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 50;
    }

    page.drawText("✦ Interview Questions & Key Answers", {
      x: 45,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.02, 0.45, 0.75)
    });
    y -= 18;

    for (const item of data.interviewQuestions) {
      if (y < 80) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawText(`Q: ${item.q}`, {
        x: 45,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.18)
      });
      y -= 13;
      page.drawText(`Ans: ${item.a}`, {
        x: 45,
        y,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.45)
      });
      y -= 15;
    }
  }

  // Footer on all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i);
    p.drawText(`APNA COLLEGE MOD APK • Page ${i + 1} of ${totalPages} • Free Student Access`, {
      x: width / 2 - 130,
      y: 20,
      size: 8,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.65)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};
