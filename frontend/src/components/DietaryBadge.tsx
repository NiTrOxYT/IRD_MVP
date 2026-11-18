import React from "react";

interface Props {
  tag: string;
}

export function DietaryBadge({ tag }: Props) {
  switch (tag.toLowerCase()) {
    case "veg":
    case "vegetarian":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Veg
        </span>
      );
    case "vegan":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
          <span>🌱</span> Vegan
        </span>
      );
    case "gluten_free":
    case "gluten-free":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <span>🌾</span> GF
        </span>
      );
    case "spicy":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200">
          <span>🌶️</span> Spicy
        </span>
      );
    case "chef_special":
    case "signature":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#B88223]/10 text-[#825C15] border border-[#B88223]/30">
          <span>★</span> Chef's Signature
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
          {tag}
        </span>
      );
  }
}
