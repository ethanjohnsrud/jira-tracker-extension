import React from "react";
import { Button, Dropdown as HeroDropdown, Label } from "@heroui/react";

interface DropdownProps {
  onChange: (value: string) => void;
  value: string;
  options: { label: string; value: string }[];
  label?: string;
}

export default function Dropdown({ onChange, value, options, label }: DropdownProps) {
  const selectedOption = options.find((option) => option?.value === value) ?? options[0];

  return (
    <HeroDropdown className="w-full border border-primary rounded-md shadow-sm bg-background">
      <HeroDropdown.Trigger className="w-full outline-none focus:outline-none">
        <div className="flex w-full flex-col border-collapse">
          {label && (
            <label className="py-1 px-2 border border-[#7bbd4a] border-b-0 text-white text-center">{label}</label>
          )}
          <span className="w-full flex items-center justify-between border border-[#7bbd4a] rounded-none text-white py-1 px-2 text-[14px] min-w-0 bg-alternative-background hover:bg-[#7bbd4a] transition duration-300 ease-in-out">
            <span className="text-center w-full">{selectedOption?.label}</span>
            <svg
              className="w-4 h-4 ml-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </HeroDropdown.Trigger>
      <HeroDropdown.Popover className="w-[var(--trigger-width)]">
        <HeroDropdown.Menu
          className="mt-2 rounded-md shadow-lg w-full max-h-60 overflow-y-auto overflow-x-hidden hide-scrollbar"
          onAction={(key) => onChange(String(key))}
        >
          {options.map((option) => (
            <HeroDropdown.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="transition duration-300 ease-in-out data-[hover=true]:!bg-[#7bbd4a] data-[hover=true]:!text-white"
            >
              <Label>{option.label}</Label>
            </HeroDropdown.Item>
          ))}
        </HeroDropdown.Menu>
      </HeroDropdown.Popover>
    </HeroDropdown>
  );
}
