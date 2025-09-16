import React from "react";

interface CategoryPreviewCardProps {
  name: string;
  eventsCount: number;
  icon: React.ElementType;
  iconColor?: string;
}

function CategoryPreviewCard({
  name,
  eventsCount,
  icon: Icon,
  iconColor,
}: CategoryPreviewCardProps) {
  return (
    <div
      className="min-w-[200px] p-4 rounded-2xl border border-gray-400/50 shadow-sm shadow-gray-800/30
      hover:shadow-md transition-all duration-300 bg-white/2 
      hover:bg-white/6 cursor-pointer flex flex-col justify-between"
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
