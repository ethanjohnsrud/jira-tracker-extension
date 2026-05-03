import { Button, Calendar, Chip, DateValue, Label, Popover } from "@heroui/react";
import { fromDate, getLocalTimeZone } from "@internationalized/date";
import { formatDate } from "date-fns";
import { CalendarDaysIcon, XIcon } from "lucide-react";

interface DatePickerFieldProps {
  value: number | null;
  onChange: (ms: number | null) => void;
  ariaLabel: string;
  label?: string;
  id?: string;
  clearable?: boolean;
  dateFormat?: string;
  /** "icon" (default) — calendar icon button; "input" — full-width input-style button */
  triggerVariant?: "icon" | "input";
  placeholder?: string;
}

const CalendarContent = ({
  ariaLabel,
  dateValue,
  onChange,
}: {
  ariaLabel: string;
  dateValue: DateValue | null;
  onChange: (dv: DateValue) => void;
}) => (
  <Calendar aria-label={ariaLabel} value={dateValue} onChange={onChange}>
    <Calendar.Header>
      <Calendar.Heading />
      <Calendar.NavButton slot="previous" />
      <Calendar.NavButton slot="next" />
    </Calendar.Header>
    <Calendar.Grid>
      <Calendar.GridHeader>
        {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
      </Calendar.GridHeader>
      <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
    </Calendar.Grid>
  </Calendar>
);

export function DatePickerField({
  value,
  onChange,
  ariaLabel,
  label,
  id,
  clearable = true,
  dateFormat = "MMM dd, yyyy",
  triggerVariant = "icon",
  placeholder = "Select date",
}: DatePickerFieldProps) {
  const dateValue = value !== null ? fromDate(new Date(value), getLocalTimeZone()) : null;
  const formattedDate = dateValue ? formatDate(dateValue.toDate(), dateFormat) : null;

  const handleChange = (dv: DateValue) => onChange(dv.toDate(getLocalTimeZone()).getTime());
  const handleClear = () => onChange(null);

  const iconTrigger = (
    <Popover.Trigger className="group rounded-full p-2 cursor-pointer hover:bg-primary">
      <CalendarDaysIcon size={18} className="text-primary group-hover:text-white" />
    </Popover.Trigger>
  );

  const inputTrigger = (
    <Popover.Trigger className="input flex h-9 flex-1 cursor-pointer items-center gap-2 text-left">
      <CalendarDaysIcon size={14} className="text-zinc-400 shrink-0" />
      <span className={formattedDate ? "text-white" : "text-zinc-500"}>
        {formattedDate ?? placeholder}
      </span>
    </Popover.Trigger>
  );

  const trigger = triggerVariant === "input" ? inputTrigger : iconTrigger;

  const popover = (
    <Popover>
      {trigger}
      <Popover.Content className="max-w-64">
        <Popover.Dialog>
          <CalendarContent ariaLabel={ariaLabel} dateValue={dateValue} onChange={handleChange} />
          {/* Chip + clear inside popover: icon-only mode, or input trigger where clear belongs in popover */}
          {(!label || triggerVariant === "input") && (
            <div className="flex justify-end items-center mt-2 gap-1">
              {!label && formattedDate && <Chip>{formattedDate}</Chip>}
              {clearable && (
                <Button size="sm" variant="ghost" onPress={handleClear}>
                  Clear
                </Button>
              )}
            </div>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );

  if (!label) return popover;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-primary">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {popover}
        {/* In icon trigger mode, show date chip inline */}
        {triggerVariant === "icon" && (
          <>
            {formattedDate ? (
              <Chip size="sm">{formattedDate}</Chip>
            ) : (
              <span className="text-sm text-zinc-500">No date set</span>
            )}
          </>
        )}
        {/* External clear only for icon trigger — input trigger clears from inside the popover */}
        {clearable && value !== null && triggerVariant === "icon" && (
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            onPress={handleClear}
            aria-label="Clear date"
            className="text-zinc-400 hover:text-white"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
