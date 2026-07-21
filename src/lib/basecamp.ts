import { getCompanyByName } from "./companies";
import { getDepartmentByCompanyAndName } from "./departments";

export type NewSlipNotification = {
  company: string;
  department: string;
  employeeName: string;
  requestType: string;
  dateOfIncident: string;
  refId: string;
};

function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    return `https://${production.replace(/^https?:\/\//, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  return "";
}

function buildSlipMessage(input: NewSlipNotification): string {
  const baseUrl = getAppBaseUrl();
  const managerUrl = baseUrl ? `${baseUrl}/manager` : "/manager";

  return [
    `<strong>New ${escapeHtml(input.requestType)} slip</strong>`,
    `${escapeHtml(input.employeeName)} · ${escapeHtml(input.company)} / ${escapeHtml(input.department)}`,
    `Date: ${escapeHtml(input.dateOfIncident)} · Ref: ${escapeHtml(input.refId)}`,
    `<a href="${escapeHtml(managerUrl)}">Open Manager Portal</a>`,
  ].join("<br>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function normalizeBasecampWebhookUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function isValidBasecampWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolve chatbot URL: department first, then company fallback.
 * Special scoped managers (e.g. Dominic) are not notified separately.
 */
async function resolveWebhookUrl(
  companyName: string,
  departmentName: string,
): Promise<{ url: string; source: "department" | "company" } | null> {
  const department = await getDepartmentByCompanyAndName(companyName, departmentName);
  const departmentUrl = department?.basecampWebhookUrl?.trim();
  if (departmentUrl) {
    return { url: departmentUrl, source: "department" };
  }

  const company = await getCompanyByName(companyName);
  const companyUrl = company?.basecampWebhookUrl?.trim();
  if (companyUrl) {
    return { url: companyUrl, source: "company" };
  }

  return null;
}

/**
 * Posts a Campfire chatbot line for a new employee slip.
 * Soft-fails: missing URL, invalid URL, or network errors never throw to callers.
 */
export async function notifyManagersOfNewSlip(input: NewSlipNotification): Promise<void> {
  try {
    const resolved = await resolveWebhookUrl(input.company, input.department);
    if (!resolved) {
      return;
    }

    if (!isValidBasecampWebhookUrl(resolved.url)) {
      console.error(
        `[basecamp] Invalid webhook URL for ${resolved.source} ${input.company}/${input.department}; skipping notification.`,
      );
      return;
    }

    const response = await fetch(resolved.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content: buildSlipMessage(input) }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[basecamp] Notify failed for ${input.refId} (${response.status}): ${body.slice(0, 300)}`,
      );
    }
  } catch (error) {
    console.error(`[basecamp] Notify error for ${input.refId}:`, error);
  }
}
