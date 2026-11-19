import React from "react";
import { Leaf, Flame, Sparkles, Wheat, CircleDot } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  tag: string;
  className?: string;
}

export function DietaryBadge({ tag, className }: Props) {
  const norm = tag.toLowerCase().replace(/-/g, "_");

  switch (norm) {
    case "veg":
    case "vegetarian":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap",
            className
          )}
        >
          <CircleDot className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
          <span>Veg</span>
        </span>
      );
    case "vegan":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-800 border border-green-300 shadow-2xs whitespace-nowrap",
            className
          )}
        >
          <Leaf className="w-2.5 h-2.5 text-green-600" />
          <span>Vegan</span>
        </span>
      );
    case "gluten_free":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap",
            className
          )}
        >
          <Wheat className="w-2.5 h-2.5 text-amber-600" />
          <span>Gluten-Free</span>
        </span>
      );
    case "spicy":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap",
            className
          )}
        >
          <Flame className="w-2.5 h-2.5 text-rose-600" />
          <span>Spicy</span>
        </span>
      );
    case "chef_special":
    case "signature":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF3E6] text-[#8E6314] border border-[#ECD7A9] shadow-2xs whitespace-nowrap",
            className
          )}
        >
          <Sparkles className="w-2.5 h-2.5 text-[#B88223]" />
          <span>Chef's Signature</span>
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200 shadow-2xs whitespace-nowrap",
            className
          )}
        >
          {tag}
        </span>
      );
  }
}
