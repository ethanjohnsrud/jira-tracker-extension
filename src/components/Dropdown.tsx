import React, { use, useEffect } from "react";
import { Dropdown as HeroDropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

export default function Dropdown({ onChange, value, options }) {
	return (
		<HeroDropdown className="w-full border border-primary rounded-md shadow-sm bg-background">
			<DropdownTrigger className="w-full outline-none focus:outline-none border-[#7bbd4a] hover:bg-[#A3E063] transition duration-300 ease-in-out">
				<button className="w-full flex items-center justify-between border border-[#7bbd4a] text-white py-1 px-2 rounded-md text-[14px] bg-alternative-background hover:bg-[#7bbd4a] transition duration-300 ease-in-out">
					<span className="text-center w-full">
						{options.find((o) => o?.value === value)?.label || options?.[0].label}
					</span>
					<svg
						className="w-4 h-4 ml-2"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			</DropdownTrigger>
			<DropdownMenu className="mt-2 rounded-md shadow-lg w-full max-h-60 overflow-y-auto overflow-x-hidden hide-scrollbar">
				{options.map((option) => (
					<DropdownItem
						key={option.value}
						onPress={(e) => onChange(e, option.value)}
						className="transition duration-300 ease-in-out data-[hover=true]:!bg-[#7bbd4a] data-[hover=true]:!text-white"
					>
						{option.label}
					</DropdownItem>
				))}
			</DropdownMenu>
		</HeroDropdown>
	);
}
