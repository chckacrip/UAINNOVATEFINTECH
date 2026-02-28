"use client";

interface ScoreGaugeProps {
  score: number;
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const getColor = (s: number) => {
    if (s >= 75) return { ring: "text-emerald-500", bg: "bg-emerald-50", label: "Excellent" };
    if (s >= 50) return { ring: "text-blue-500", bg: "bg-blue-50", label: "Good" };
    if (s >= 25) return { ring: "text-amber-500", bg: "bg-amber-50", label: "Fair" };
    return { ring: "text-red-500", bg: "bg-red-50", label: "Needs Work" };
  };

  const { ring, label } = getColor(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-100"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={ring}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{score}</span>
        </div>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-700">
        Financial Score &middot; {label}
      </p>
    </div>
  );
}
