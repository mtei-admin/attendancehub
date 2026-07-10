export function formatManagerTime(value: string | null): string {
  if (!value) return "—";

  const [hourPart, minutePart] = value.split(":");
  const hour = Number.parseInt(hourPart ?? "", 10);
  const minute = Number.parseInt(minutePart ?? "", 10);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatManagerSubmittedDate(date: Date | string | null): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getEmployeeTypeLabel(type: string | undefined): string {
  if (type === "Rank & File") return "R&F";
  if (type === "Confi") return "Confi";
  return "";
}

export function getEmployeeTypeBadgeClass(type: string | undefined): string {
  if (type === "Confi") {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-emerald-100 text-emerald-700";
}
