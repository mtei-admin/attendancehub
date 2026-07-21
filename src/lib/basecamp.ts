import { getCompanyByName } from "./companies";

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
 * Posts a Campfire chatbot line for a new employee slip.
 * Soft-fails: missing URL, invalid URL, or network errors never throw to callers.
 */
export async function notifyManagersOfNewSlip(input: NewSlipNotification): Promise<void> {
  try {
    const company = await getCompanyByName(input.company);
    const webhookUrl = company?.basecampWebhookUrl?.trim();
    if (!webhookUrl) {
      return;
    }

    if (!isValidBasecampWebhookUrl(webhookUrl)) {
      console.error(
        `[basecamp] Invalid webhook URL for company ${input.company}; skipping notification.`,
      );
      return;
    }

    const response = await fetch(webhookUrl, {
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
