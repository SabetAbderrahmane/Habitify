import { api } from "./api";

export async function downloadUserExport() {
  const response = await api.get("/export/data", {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="(.+)"/);
  const filename = match?.[1] || "habitify_export.json";

  const blob = new Blob([response.data], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
