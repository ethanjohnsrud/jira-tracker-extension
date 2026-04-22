import { Checkbox, Label } from "@heroui/react";

interface CheckboxWrapperProps {
  id: string;
  label: string;
  onChange?: (isSelected: boolean) => void;
  isSelected?: boolean;
}

export const CheckboxWrapper = ({ id, label, onChange, isSelected }: CheckboxWrapperProps) => {
  return (
    <Checkbox id={id} isSelected={isSelected} onChange={onChange} className="gap-2">
      <Checkbox.Control className="size-3">
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Content>
        <Label htmlFor={id} className="text-sm cursor-pointer">
          {label}
        </Label>
      </Checkbox.Content>
    </Checkbox>
  );
};
