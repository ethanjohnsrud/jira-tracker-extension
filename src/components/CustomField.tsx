import { Input, Label, TextArea } from "@heroui/react";
import type { ChangeEventHandler } from "react";

interface TextInputProps {
  id: string;
  value: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  label: string;
}

export function CustomTextField({ id, value, onChange, placeholder, label }: TextInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-primary">{label}</Label>
      <Input
        id={id}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={onChange}
        className="ring-0"
      />
    </div>
  );
}

interface TextAreaInputProps {
  id: string;
  value: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  label: string;
  error?: string | null;
}

export function CustomTextAreaField({ id, value, onChange, placeholder, label, error }: TextAreaInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-primary">{label}</Label>
      <TextArea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="ring-0"
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
