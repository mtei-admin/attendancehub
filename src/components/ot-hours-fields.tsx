import { FormField, inputClassName } from "./form-field";

type OtHoursFieldsProps = {
  label?: string;
  hoursName: string;
  minutesName: string;
  defaultHours?: string;
  defaultMinutes?: string;
  required?: boolean;
  className?: string;
};

export function OtHoursFields({
  label = "Hours to claim",
  hoursName,
  minutesName,
  defaultHours = "",
  defaultMinutes = "",
  required = false,
  className = "",
}: OtHoursFieldsProps) {
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
            defaultValue={defaultHours}
            placeholder="0"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-500">Minutes</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name={minutesName}
            defaultValue={defaultMinutes}
            placeholder="0"
            className={inputClassName}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Whole numbers only — no decimals. Example: 1 hour 30 minutes = Hours 1, Minutes 30.
        {required ? " At least one value greater than zero is required." : ""}
      </p>
    </FormField>
  );
}
