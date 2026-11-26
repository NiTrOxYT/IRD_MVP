import React from "react";
import { Leaf, Flame, Wheat } from "lucide-react";
import { HeritageCrestIcon } from "../../../core/ui/CustomResortIcons";
import { cn } from "../../../core/ui/utils";

interface Props {
  tag: string;
  className?: string;
  variant?: "light" | "glass";
}

export function DietaryBadge({ tag, className, variant = "light" }: Props) {
  const norm = tag.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const isGlass = variant === "glass";

  switch (norm) {
    case "veg":
    case "vegetarian":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
            isGlass
              ? "border-emerald-300/35 bg-emerald-950/65 text-emerald-100"
              : "rounded-md border-emerald-300 bg-emerald-50 text-emerald-800",
            className
          )}
        >
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-[2px] border border-emerald-500 bg-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          </span>
          <span>Veg</span>
        </span>
      );
    case "non_veg":
    case "nonveg":
    case "non_vegetarian":
    case "nonvegetarian":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
            isGlass
              ? "border-rose-300/35 bg-rose-950/65 text-rose-100"
              : "rounded-md border-rose-300 bg-rose-50 text-rose-800",
            className
          )}
        >
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-[2px] border border-rose-500 bg-white">
            <svg viewBox="0 0 10 10" className="h-2 w-2 fill-rose-600" aria-hidden="true">
              <polygon points="5,1.5 8.5,8.5 1.5,8.5" />
            </svg>
          </span>
          <span>Non-Veg</span>
        </span>
      );
    case "vegan":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
            isGlass
              ? "border-green-300/35 bg-green-950/65 text-green-100"
              : "rounded-md border-green-300 bg-green-50 text-green-800",
            className
          )}
        >
          <Leaf className={cn("w-2.5 h-2.5", isGlass ? "text-green-200" : "text-green-600")} />
          <span>Vegan</span>
        </span>
      );
    case "gluten_free":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
            isGlass
              ? "border-amber-200/35 bg-amber-950/65 text-amber-100"
              : "rounded-md border-amber-300 bg-amber-50 text-amber-800",
            className
          )}
        >
          <Wheat className={cn("w-2.5 h-2.5", isGlass ? "text-amber-200" : "text-amber-600")} />
          <span>Gluten-Free</span>
        </span>
      );
    case "spicy":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
            isGlass
              ? "border-rose-300/35 bg-rose-950/65 text-rose-100"
              : "rounded-md border-rose-300 bg-rose-50 text-rose-800",
            className
          )}
        >
          <Flame className={cn("w-2.5 h-2.5", isGlass ? "text-rose-200" : "text-rose-600")} />
          <span>Spicy</span>
        </span>
      );
    case "chef_special":
    case "signature":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
            isGlass
              ? "border-white/25 bg-black/45 text-white"
              : "rounded-md border-[#ECD7A9] bg-[#FAF3E6] text-[#8E6314]",
            className
          )}
        >
          <HeritageCrestIcon className={cn("w-3 h-3", isGlass ? "text-white" : "text-[#B88223]")} />
          <span>Bestseller</span>
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
            isGlass
              ? "border-white/20 bg-white/12 text-white/85"
              : "rounded-md border-stone-200 bg-stone-100 text-stone-700",
            className
          )}
        >
          {tag}
        </span>
      );
  }
}
