// components/CategoryPreviewCard.tsx
import React from "react";

interface CategoryPreviewCardProps {
  name: string;
  eventsCount: number;
  icon: React.ElementType;
  iconColor?: string;
  selected?: boolean;
  onClick?: () => void;
}

function CategoryPreviewCard({
  name,
  eventsCount,
  icon: Icon,
  iconColor,
  selected,
  onClick,
}: CategoryPreviewCardProps) {
  return (
    <div
      onClick={onClick}
      className={`min-w-[200px] p-4 rounded-2xl border shadow-sm transition-all duration-300 cursor-pointer flex flex-col justify-between ${
        selected
          ? "border-purple-500 bg-purple-900/30 shadow-purple-900/20"
          : "border-gray-400/50 shadow-gray-800/30 bg-white/2 hover:bg-white/6 hover:shadow-md hover:border-gray-400"
      }`}
    >
      <span className="h-10 w-10">
        <Icon style={{ color: iconColor, width: "2rem", height: "2rem" }} />
      </span>
      <h2 className="text-lg font-semibold text-gray-300">{name}</h2>
      <p className="text-sm text-gray-400">{eventsCount} events</p>
    </div>
  );
}

export default CategoryPreviewCard;