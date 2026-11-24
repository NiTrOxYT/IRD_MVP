import React from "react";
import { Flame, Leaf, Wheat } from "lucide-react";
import { cn } from "../../../core/ui/utils";
import { CulinaryClassificationMark } from "../../../core/ui/EnterpriseIcons";

interface Props {
  tag: string;
  className?: string;
}

export function DietaryBadge({ tag, className }: Props) {
  const norm = tag.trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (norm) {
    case "veg":
    case "vegetarian":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-[rgba(20,18,16,0.12)] bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-[#141210] whitespace-nowrap",
            className
          )}
        >
          <CulinaryClassificationMark variant="veg" />
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
            "inline-flex items-center gap-1.5 rounded-md border border-[rgba(20,18,16,0.12)] bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-[#141210] whitespace-nowrap",
            className
          )}
        >
          <CulinaryClassificationMark variant="non_veg" />
          <span>Non-Veg</span>
        </span>
      );
    case "vegan":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-emerald-700/20 bg-emerald-50/90 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900 whitespace-nowrap",
            className
          )}
        >
          <Leaf className="h-2.5 w-2.5 text-emerald-700" strokeWidth={1.5} />
          <span>Vegan</span>
        </span>
      );
    case "gluten_free":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-amber-700/20 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 whitespace-nowrap",
            className
          )}
        >
          <Wheat className="h-2.5 w-2.5 text-amber-700" strokeWidth={1.5} />
          <span>Gluten-Free</span>
        </span>
      );
    case "spicy":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-rose-700/20 bg-rose-50/90 px-1.5 py-0.5 text-[10px] font-medium text-rose-900 whitespace-nowrap",
            className
          )}
        >
          <Flame className="h-2.5 w-2.5 text-rose-700" strokeWidth={1.5} />
          <span>Spicy</span>
        </span>
      );
    case "chef_special":
    case "signature":
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-md border border-[#D9C7A3] bg-[#FBF8F1]/95 px-1.5 py-0.5 text-[10px] font-medium text-[#7A591C] whitespace-nowrap",
            className
          )}
        >
          Signature
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-md border border-[rgba(20,18,16,0.12)] bg-[#F6F4EF] px-1.5 py-0.5 text-[10px] font-medium text-[#5C554E] whitespace-nowrap",
            className
          )}
        >
          {tag}
        </span>
      );
  }
}
