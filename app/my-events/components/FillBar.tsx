"use client";
// app/my-events/components/FillBar.tsx


export function FillBar({ rate }: { rate: number }) {
  const color =
    rate >= 90 ? "bg-purple-500" :
    rate >= 70 ? "bg-green-500" :
    rate >= 40 ? "bg-orange-500" : "bg-gray-600";

  const textColor =
    rate >= 90 ? "text-purple-400" :
    rate >= 70 ? "text-green-400" :
    rate >= 40 ? "text-orange-400" : "text-gray-500";

  return (
    <div className="flex items-center gap-3">
      
      <span className="text-gray-500 text-sm whitespace-nowrap">
        Fill Rate
      </span>

      <div className="flex-1 bg-gray-700 rounded-full h-[3px] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>

      <span className={`text-sm font-semibold ${textColor}`}>
        {rate}%
      </span>

    </div>
  );
}