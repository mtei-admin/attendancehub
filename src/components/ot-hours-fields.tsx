import { FormField, inputClassName } from "./form-field";

type OtHoursFieldsProps = {
  label?: string;
  hoursName: string;
  minutesName: string;
  hoursValue?: string;
  minutesValue?: string;
  onHoursChange?: (value: string) => void;
  onMinutesChange?: (value: string) => void;
  defaultHours?: string;
  defaultMinutes?: string;
  required?: boolean;
  readOnly?: boolean;
  helperText?: string;
  className?: string;
};

export function OtHoursFields({
  label = "Hours to claim",
  hoursName,
  minutesName,
  hoursValue,
  minutesValue,
  onHoursChange,
  onMinutesChange,
  defaultHours = "",
  defaultMinutes = "",
  required = false,
  readOnly = false,
  helperText,
  className = "",
}: OtHoursFieldsProps) {
  const isControlled = hoursValue !== undefined && minutesValue !== undefined;

  return (
    <FormField label={label} className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-500">Hours</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name={hoursName}
            value={isControlled ? hoursValue : undefined}
            defaultValue={isControlled ? undefined : defaultHours}
            onChange={onHoursChange ? (event) => onHoursChange(event.target.value) : undefined}
            placeholder="0"
            readOnly={readOnly}
            required={required}
            className={`${inputClassName} ${readOnly ? "cursor-not-allowed bg-slate-100 text-slate-700" : ""}`}
          />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-500">Minutes</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name={minutesName}
            value={isControlled ? minutesValue : undefined}
            defaultValue={isControlled ? undefined : defaultMinutes}
            onChange={onMinutesChange ? (event) => onMinutesChange(event.target.value) : undefined}
            placeholder="0"
            readOnly={readOnly}
            required={required}
            className={`${inputClassName} ${readOnly ? "cursor-not-allowed bg-slate-100 text-slate-700" : ""}`}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {helperText ??
          (readOnly
            ? "Calculated automatically from From and To times."
            : "Whole numbers only — no decimals. Example: 1 hour 30 minutes = Hours 1, Minutes 30.")}
        {!readOnly && required ? " At least one value greater than zero is required." : ""}
      </p>
    </FormField>
  );
}
