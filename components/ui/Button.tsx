"use client";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "brand" | "secondary" | "ghost";
};

export default function Button({ variant = "brand", className, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        variant === "brand" && "btn-brand",
        variant === "secondary" && "btn-secondary",
        variant === "ghost" && "px-4 py-2 rounded-xl text-brand-red border border-brand-red/20 hover:bg-brand-red/5",
        "disabled:opacity-60",
        className
      )}
    />
  );
}
