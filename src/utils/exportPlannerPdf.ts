import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { StudyPlan } from "../types";

/**
 * Sanitizes a topic string into a safe file name component.
 */
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/**
 * Generates and downloads a clean, elite, classic academic PDF study plan.
 */
export function exportStudyPlanAsPdf(plan: StudyPlan): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const colorPrimary = [79, 70, 229]; // Indigo-600 #4F46E5
  const colorPrimaryDark = [49, 46, 129]; // Indigo-900 #312E81
  const colorSlate900 = [15, 23, 42]; // #0F172A
  const colorSlate700 = [51, 65, 85]; // #334155
  const colorSlate500 = [100, 116, 139]; // #64748B
  const colorSlate400 = [148, 163, 184]; // #94A3B8
  const colorLightBg = [248, 250, 252]; // Slate-50 #F8FAFC
  const colorBorder = [226, 232, 240]; // Slate-200 #E2E8F0

  let currentY = margin;

  // Helper to check page bounds and add page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 50) {
      doc.addPage();
      currentY = margin + 15;
    }
  };

  // ==========================================
  // TOP SECTION: BRANDING & TITLE HIERARCHY
  // ==========================================

  // 1. STUDYPILOT Header Logo/Mark (medium/small-medium size, visible, generous whitespace)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text("S T U D Y P I L O T", pageWidth / 2, currentY, { align: "center" });
  currentY += 14;

  // 2. Creator Credit directly underneath: "Created by — Mishra Ji" (small, elegant, subtle)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(colorSlate500[0], colorSlate500[1], colorSlate500[2]);
  doc.text("Created by \u2014 Mishra Ji", pageWidth / 2, currentY, { align: "center" });
  currentY += 22;

  // Subtle separator line under branding
  doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
  doc.setLineWidth(0.75);
  doc.line(pageWidth / 2 - 60, currentY, pageWidth / 2 + 60, currentY);
  currentY += 20;

  // 3. Dynamic Subject / Topic Title (Prominent Main Title)
  const displayTitle = plan.title.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(colorSlate900[0], colorSlate900[1], colorSlate900[2]);

  // Wrap title if long
  const titleLines = doc.splitTextToSize(displayTitle, contentWidth - 20);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, currentY, { align: "center" });
    currentY += 20;
  });

  // Subtitle: Personalized Study Plan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(colorPrimaryDark[0], colorPrimaryDark[1], colorPrimaryDark[2]);
  doc.text("Personalized Academic Study Plan", pageWidth / 2, currentY, { align: "center" });
  currentY += 20;

  // ==========================================
  // METADATA SUMMARY BAR
  // ==========================================
  const metaBoxHeight = 36;
  doc.setFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2]);
  doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 4, 4, "FD");

  const colWidth = contentWidth / 3;
  const metaY = currentY + 14;

  // Column 1: Target Goal / Exam
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(colorSlate500[0], colorSlate500[1], colorSlate500[2]);
  doc.text("TARGET EXAM / GOAL", margin + 12, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colorSlate900[0], colorSlate900[1], colorSlate900[2]);
  const examText = (plan.examName || "Final Examinations").slice(0, 26);
  doc.text(examText, margin + 12, metaY + 12);

  // Column 2: Timeline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(colorSlate500[0], colorSlate500[1], colorSlate500[2]);
  doc.text("TARGET TIMELINE", margin + colWidth + 12, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colorSlate900[0], colorSlate900[1], colorSlate900[2]);
  doc.text(plan.examDate || "Scheduled", margin + colWidth + 12, metaY + 12);

  // Column 3: Hours / Commitment
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(colorSlate500[0], colorSlate500[1], colorSlate500[2]);
  doc.text("WEEKLY COMMITMENT", margin + colWidth * 2 + 12, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text(`${plan.totalHoursPerWeek || 0} Hours / Week`, margin + colWidth * 2 + 12, metaY + 12);

  currentY += metaBoxHeight + 20;

  // ==========================================
  // SECTION: STUDY OBJECTIVE & SUMMARY
  // ==========================================
  if (plan.summary) {
    checkPageBreak(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colorPrimaryDark[0], colorPrimaryDark[1], colorPrimaryDark[2]);
    doc.text("1. STUDY OBJECTIVE & EXECUTIVE SUMMARY", margin, currentY);
    currentY += 12;

    doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, currentY, margin + 35, currentY);
    currentY += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(colorSlate700[0], colorSlate700[1], colorSlate700[2]);
    const summaryLines = doc.splitTextToSize(plan.summary, contentWidth);
    summaryLines.forEach((line: string) => {
      checkPageBreak(14);
      doc.text(line, margin, currentY);
      currentY += 14;
    });
    currentY += 12;
  }

  // ==========================================
  // SECTION: WEEKLY MILESTONES & STUDY SCHEDULE
  // ==========================================
  if (plan.weeklyMilestones && plan.weeklyMilestones.length > 0) {
    checkPageBreak(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colorPrimaryDark[0], colorPrimaryDark[1], colorPrimaryDark[2]);
    doc.text("2. STRUCTURED STUDY SCHEDULE & MODULE TASKS", margin, currentY);
    currentY += 12;

    doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, currentY, margin + 35, currentY);
    currentY += 14;

    plan.weeklyMilestones.forEach((week) => {
      checkPageBreak(70);

      // Week Banner Heading
      doc.setFillColor(colorLightBg[0], colorLightBg[1], colorLightBg[2]);
      doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
      doc.roundedRect(margin, currentY, contentWidth, 22, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
      doc.text(`WEEK ${week.weekNumber}: `, margin + 8, currentY + 14);

      const weekLabelWidth = doc.getTextWidth(`WEEK ${week.weekNumber}: `);
      doc.setTextColor(colorSlate900[0], colorSlate900[1], colorSlate900[2]);
      doc.text(week.theme || "Academic Focus", margin + 8 + weekLabelWidth, currentY + 14);

      currentY += 28;

      // Focus Goals if present
      if (week.focusGoals && week.focusGoals.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(colorSlate700[0], colorSlate700[1], colorSlate700[2]);
        doc.text("Key Goals: ", margin + 4, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colorSlate500[0], colorSlate500[1], colorSlate500[2]);
        const goalsText = week.focusGoals.join("  \u2022  ");
        const goalLines = doc.splitTextToSize(goalsText, contentWidth - 60);
        doc.text(goalLines, margin + 55, currentY);
        currentY += goalLines.length * 11 + 8;
      }

      // Build Table Data for Days and Tasks in this Week
      const tableRows: string[][] = [];
      week.days?.forEach((day) => {
        if (day.tasks && day.tasks.length > 0) {
          day.tasks.forEach((task, idx) => {
            tableRows.push([
              idx === 0 ? day.dayName : "",
              idx === 0 ? day.focusSubject : "",
              task.title,
              `${task.durationMinutes}m`,
              task.priority,
              task.completed ? "Completed" : "Pending",
            ]);
          });
        } else {
          tableRows.push([day.dayName, day.focusSubject, "Revision & Self-Study", "60m", "Medium", "Pending"]);
        }
      });

      if (tableRows.length > 0) {
        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [["Day", "Subject", "Task Description", "Duration", "Priority", "Status"]],
          body: tableRows,
          theme: "grid",
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold",
            halign: "left",
            cellPadding: 4,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85],
            cellPadding: 4,
          },
          columnStyles: {
            0: { cellWidth: 55, fontStyle: "bold", textColor: [15, 23, 42] },
            1: { cellWidth: 80, fontStyle: "bold", textColor: [79, 70, 229] },
            2: { cellWidth: "auto" },
            3: { cellWidth: 50, halign: "center" },
            4: { cellWidth: 50, halign: "center" },
            5: { cellWidth: 55, halign: "center" },
          },
          didParseCell: (data) => {
            // Highlight High Priority in red/amber
            if (data.column.index === 4 && data.section === "body") {
              const val = String(data.cell.raw).toLowerCase();
              if (val.includes("high")) {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = "bold";
              } else if (val.includes("low")) {
                data.cell.styles.textColor = [100, 116, 139];
              }
            }
            // Highlight Status
            if (data.column.index === 5 && data.section === "body") {
              const statusVal = String(data.cell.raw);
              if (statusVal === "Completed") {
                data.cell.styles.textColor = [22, 101, 52];
                data.cell.styles.fontStyle = "bold";
              } else {
                data.cell.styles.textColor = [100, 116, 139];
              }
            }
          },
        });

        const finalY = (doc as any).lastAutoTable?.finalY;
        currentY = (finalY || currentY) + 16;
      }
    });
  }

  // ==========================================
  // SECTION: STRATEGIC PRO TIPS & RETENTION
  // ==========================================
  if (plan.proTips && plan.proTips.length > 0) {
    checkPageBreak(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colorPrimaryDark[0], colorPrimaryDark[1], colorPrimaryDark[2]);
    doc.text("3. HIGH-RETENTION STUDY STRATEGIES & PRO TIPS", margin, currentY);
    currentY += 12;

    doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, currentY, margin + 35, currentY);
    currentY += 12;

    plan.proTips.forEach((tip, i) => {
      checkPageBreak(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
      doc.text(`${i + 1}.`, margin + 4, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(colorSlate700[0], colorSlate700[1], colorSlate700[2]);
      const tipLines = doc.splitTextToSize(tip, contentWidth - 25);
      doc.text(tipLines, margin + 18, currentY);
      currentY += tipLines.length * 11 + 6;
    });

    currentY += 10;
  }

  // ==========================================
  // FOOTER ON EVERY PAGE
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Top border of footer
    const footerY = pageHeight - 28;
    doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

    // Left Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(colorSlate400[0], colorSlate400[1], colorSlate400[2]);
    doc.text("StudyPilot AI  \u2022  Created by \u2014 Mishra Ji", margin, footerY);

    // Right Footer
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  }

  // ==========================================
  // DOWNLOAD ACTION WITH SANITIZED FILENAME
  // ==========================================
  const sanitizedTopic = sanitizeFileName(plan.title || plan.examName || "Study_Topic");
  const fileName = `StudyPilot_${sanitizedTopic}_Study_Plan.pdf`;

  doc.save(fileName);
}
