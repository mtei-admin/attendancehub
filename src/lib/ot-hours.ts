import { computeHoursFromTimeRange } from "./ot-offset-balance";
import { parseOtHours } from "./ot-summary";

export type OtHoursFieldParseResult = {
  totalHours: number;
  storedValue: string;
  valid: boolean;
  error?: string;
  empty: boolean;
};

const WHOLE_NUMBER_PATTERN = /^\d+$/;

function parseWholeNumberField(
  value: string,
  label: string,
): { value: number; valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: 0, valid: true };
  }

  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return {
      value: 0,
      valid: false,
      error: `${label} must be a whole number with no decimals.`,
    };
  }

  return { value: Number.parseInt(trimmed, 10), valid: true };
}

export function parseOtHoursPartsFromTimeRange(
  timeIn: string,
  timeOut: string,
): {
  hours: string;
  minutes: string;
  storedValue: string;
  valid: boolean;
  error?: string;
} {
  const result = computeHoursFromTimeRange(timeIn, timeOut);

  if (!result.valid || result.empty || result.totalHours <= 0) {
    return {
      hours: "",
      minutes: "",
      storedValue: "",
      valid: false,
      error: result.error ?? "Enter valid From and To times.",
    };
  }

  const totalMinutes = Math.round(result.totalHours * 60);

  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
    storedValue: result.storedValue,
    valid: true,
  };
}

export function splitStoredOtHours(value: string | null | undefined): {
  hours: string;
  minutes: string;
} {
  const parsed = parseOtHours(value ?? null);
  if (!parsed.valid || parsed.hours <= 0) {
    return { hours: "", minutes: "" };
  }

  const totalMinutes = Math.round(parsed.hours * 60);
  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  };
}

export function parseOtHoursFromFields(
  hoursRaw: string,
  minutesRaw: string,
  options?: { required?: boolean },
): OtHoursFieldParseResult {
  const hoursStr = hoursRaw.trim();
  const minutesStr = minutesRaw.trim();
  const empty = !hoursStr && !minutesStr;

  if (empty) {
    if (options?.required) {
      return {
        totalHours: 0,
        storedValue: "",
        valid: false,
        empty: true,
        error: "Enter hours and/or minutes.",
      };
    }

    return { totalHours: 0, storedValue: "", valid: true, empty: true };
  }

  const hoursParsed = parseWholeNumberField(hoursStr, "Hours");
  if (!hoursParsed.valid) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: hoursParsed.error,
    };
  }

  const minutesParsed = parseWholeNumberField(minutesStr, "Minutes");
  if (!minutesParsed.valid) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: minutesParsed.error,
    };
  }

  const hours = hoursParsed.value;
  const minutes = minutesParsed.value;

  if (hours < 0) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: "Hours must be 0 or greater.",
    };
  }

  if (minutes < 0 || minutes > 59) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: "Minutes must be between 0 and 59.",
    };
  }

  if (hours === 0 && minutes === 0) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: "Enter at least one hour or minute greater than zero.",
    };
  }

  const totalHours = hours + minutes / 60;

  return {
    totalHours,
    storedValue: totalHours.toFixed(2),
    valid: true,
    empty: false,
  };
}

export function readOtHoursFromFormData(
  formData: FormData,
  hoursKey: string,
  minutesKey: string,
  options?: { required?: boolean },
): OtHoursFieldParseResult {
  return parseOtHoursFromFields(
    String(formData.get(hoursKey) ?? ""),
    String(formData.get(minutesKey) ?? ""),
    options,
  );
}

export function formatOtHoursLabel(totalHours: number): string {
  const totalMinutes = Math.round(totalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
