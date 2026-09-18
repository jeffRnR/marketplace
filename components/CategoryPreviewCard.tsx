// components/CategoryPreviewCard.tsx
import React from "react";

interface CategoryPreviewCardProps {
  name: string;
  eventsCount: number;
  icon: React.ElementType;
  iconColor?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

function CategoryPreviewCard({
  name,
  eventsCount,
  icon: Icon,
  iconColor,
  selected,
  onClick,
  className,
}: CategoryPreviewCardProps) {
  return (
    <div
      onClick={onClick}
      className={`min-w-[200px] p-4 rounded-2xl border-[0.5px] shadow-sm transition-all duration-300 cursor-pointer flex flex-col justify-between ${selected
        ? "border-[var(--brand-purple)] bg-[var(--surface)]"
        : "border-[var(--brand-purple)]/35 bg-[var(--surface)] hover:-translate-y-1 hover:border-[var(--brand-purple)]"
        }`}
    >
      <span className="h-10 w-10">
        <Icon style={{ color: iconColor, width: "2rem", height: "2rem" }} />
      </span>
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{name}</h2>
      <p className="text-sm text-[var(--muted)]">{eventsCount} events</p>
    </div>
  );
}

export default CategoryPreviewCard;