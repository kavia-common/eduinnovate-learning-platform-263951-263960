import React from "react";
import "../../ui/layout/layout.css";

/**
 * PUBLIC_INTERFACE
 * Button - Ocean Professional styled button component.
 * @param {object} props
 * @param {"primary"|"secondary"|"danger"|"ghost"} props.variant
 * @param {boolean} props.block - full width
 * @param {string} props.ariaLabel - accessible label override
 */
export default function Button({
  variant = "primary",
  block = false,
  className = "",
  children,
  ariaLabel,
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 rounded-[10px] border transition-all";
  const variants = {
    primary:
      "bg-[var(--ocean-primary)] text-white border-transparent shadow hover:translate-y-[-1px] hover:shadow-md",
    secondary:
      "bg-white text-[var(--ocean-primary)] border-[rgba(37,99,235,0.3)] hover:bg-[rgba(37,99,235,0.06)]",
    danger:
      "bg-[var(--ocean-error)] text-white border-transparent hover:opacity-90",
    ghost:
      "bg-transparent text-[var(--ocean-text)] border-[rgba(17,24,39,0.08)] hover:bg-[rgba(37,99,235,0.06)]",
  };
  const finalClass = `${base} ${variants[variant] || variants.primary} ${
    block ? "w-full" : ""
  } ${className}`.trim();

  return (
    <button
      type="button"
      className={finalClass}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  );
}
