import React from "react";
import { Button as HeroButton, ButtonGroup } from "@heroui/react";

export default function Button({
  label,
  onClick,
  className = "",
  loading = false,
  type = "primary",
}) {
  const colorClasses = {
    primary: "bg-primary text-white hover:bg-primary/80",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    "alternative-background": "bg-alternative-background text-white hover:bg-opacity-80",
  };
  
  return (
    <HeroButton
      className={`rounded-md w-full px-4 py-2 flex items-center justify-center gap-2 transition-all
        ${colorClasses[type] || "bg-primary text-white"}
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      onPress={onClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 text-white ml-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      <span>{label}</span>
    </HeroButton>
  );
}
