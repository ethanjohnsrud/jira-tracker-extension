import { cn, ListBox, Select } from "@heroui/react";

type Props = {
  options: { label: string; value: string; }[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function SelectInput({ options, value, onChange, className }: Props) {
  return (
    <Select
      className={`rounded border border-[#5b863a] ${className}`}
      value={value}
      onChange={item => {
        onChange?.(String(item));
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="border border-primary">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
              className={cn("hover:outline-solid hover:outline-blue-400 outline-offset-2 outline-2", {
                "bg-primary": value === option.value,
              })}
            >
              {option.label}
              {/* <ListBox.ItemIndicator /> */}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}