import React from "react";

interface CategoryCardProps {
  name: string;
  eventsCount: number;
  description?: string;
  image?: string;
  icon?: string;
  iconColor?: string;
}

function CategoryCard({ name, eventsCount, description, image, icon, iconColor }: CategoryCardProps) {
  return (
    <div
      className="rounded-2xl border border-gray-400/50 shadow-md overflow-hidden 
      bg-white/5 hover:shadow-lg transition duration-300"
    >
      {image && (
        <div className="h-40 w-full overflow-hidden">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-300">{name}</h2>
        <p className="text-sm text-gray-300">{eventsCount} events</p>
        {description && (
          <p className="text-gray-300 mt-2 text-sm">{description}</p>
        )}
      </div>
    </div>
  );
}

export default CategoryCard;
