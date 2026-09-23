import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "quiet" | "ghost";
  icon?: ReactNode;
}

export function ChoiceButton({ variant = "primary", icon, children, ...props }: Props) {
  return (
    <button className={`choice-button ${variant}`} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
