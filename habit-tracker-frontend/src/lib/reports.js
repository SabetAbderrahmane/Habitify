import { api } from "./api";

export async function fetchReportSummary(startDate, endDate) {
  const res = await api.get("/reports/summary", {
    params: { start_date: startDate, end_date: endDate },
  });
  return res.data;
}

export async function downloadReportCsv(startDate, endDate) {
  const response = await api.get("/reports/export/csv", {
    params: { start_date: startDate, end_date: endDate },
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="(.+)"/);
  const filename = match?.[1] || `habitify_report_${startDate}_${endDate}.csv`;
  const blob = new Blob([response.data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
