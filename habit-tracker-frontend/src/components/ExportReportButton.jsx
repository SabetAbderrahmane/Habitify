import { jsPDF } from "jspdf";
import { useState } from "react";
import { HiDownload } from "react-icons/hi";

export default function ExportReportButton({ habits, logs, predictions }) {
  const [busy, setBusy] = useState(false);

  const generatePDF = async () => {
    setBusy(true);
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleString();

      // Title
      doc.setFontSize(22);
      doc.setTextColor(40, 44, 52);
      doc.text("Habitify Progress Report", 20, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${now}`, 20, 30);

      // 1. Summary Section
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Habit Overview", 20, 45);

      let y = 55;
      habits.forEach((h, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. ${h.name}`, 20, y);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Category: ${h.category || "None"} | Frequency: ${h.frequency}`, 25, y + 5);
        y += 15;
      });

      // 2. Risk Predictions Section
      if (predictions && predictions.length > 0) {
        doc.addPage();
        y = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("AI Lapse Risk Analysis", 20, y);
        y += 15;

        predictions.forEach((p) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          const riskColor = p.risk_level === "High" ? [255, 0, 0] : p.risk_level === "Medium" ? [255, 165, 0] : [0, 128, 0];
          doc.setTextColor(...riskColor);
          doc.text(`${p.habit_name}: ${p.risk_level} Risk (${Math.round(p.lapse_risk_score * 100)}%)`, 20, y);
          
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          p.factors.forEach((f, fi) => {
            doc.text(`- ${f}`, 25, y + 5 + (fi * 5));
          });
          y += 10 + (p.factors.length * 5);
        });
      }

      // 3. Recent Activity (Last 7 logs)
      doc.addPage();
      y = 20;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Recent Activity (Last 14 Days)", 20, y);
      y += 15;

      const recentLogs = [...logs]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20);

      recentLogs.forEach((l) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`${l.date}: ${l.name || "Habit"} - ${l.progress}%`, 20, y);
        y += 7;
      });

      doc.save(`Habitify_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={busy}
      className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium ring-1 ring-white/15 hover:bg-white/15 transition active:scale-95 disabled:opacity-50"
    >
      <HiDownload className="h-4 w-4" />
      {busy ? "Generating..." : "Export Progress Report"}
    </button>
  );
}
