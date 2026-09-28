import React from "react";

export interface FlagIconProps extends React.SVGProps<SVGSVGElement> {
  currency?: string;
  code?: string;
  className?: string;
}

const EU_FLAG_STARS = [
  { cx: 130, cy: 0 },
  { cx: 112.58, cy: 65 },
  { cx: 65, cy: 112.58 },
  { cx: 0, cy: 130 },
  { cx: -65, cy: 112.58 },
  { cx: -112.58, cy: 65 },
  { cx: -130, cy: 0 },
  { cx: -112.58, cy: -65 },
  { cx: -65, cy: -112.58 },
  { cx: 0, cy: -130 },
  { cx: 65, cy: -112.58 },
  { cx: 112.58, cy: -65 },
];

export function FlagIcon({ currency, code: propCode, className = "h-3.5 w-5 rounded-[2px] shadow-2xs shrink-0 object-cover", ...props }: FlagIconProps) {
  const code = (currency || propCode || "").toUpperCase();

  if (code === "USD") {
    // United States Flag SVG
    return (
      <svg
        viewBox="0 0 640 480"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...props}
      >
        <g fillRule="evenodd">
          <path fill="#bd3d44" d="M0 0h640v480H0z" />
          <path
            stroke="#fff"
            strokeWidth="37"
            d="M0 55.5h640M0 129.5h640M0 203.5h640M0 277.5h640M0 351.5h640M0 425.5h640"
          />
          <path fill="#192f5d" d="M0 0h256v259H0z" />
          {/* Stars grid */}
          <g fill="#fff">
            {[0, 1, 2, 3, 4].map((row) =>
              [0, 1, 2, 3, 4, 5].map((col) => (
                <circle
                  key={`star1-${row}-${col}`}
                  cx={20 + col * 43}
                  cy={24 + row * 52}
                  r="7"
                />
              ))
            )}
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2, 3, 4].map((col) => (
                <circle
                  key={`star2-${row}-${col}`}
                  cx={41 + col * 43}
                  cy={50 + row * 52}
                  r="7"
                />
              ))
            )}
          </g>
        </g>
      </svg>
    );
  }

  if (code === "NPR") {
    // Nepal Flag SVG
    return (
      <svg
        viewBox="0 0 400 480"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...props}
      >
        <path
          d="M20 10 L300 210 L150 210 L340 450 L20 450 Z"
          fill="#DC143C"
          stroke="#003893"
          strokeWidth="24"
          strokeLinejoin="round"
        />
        {/* White moon in top pennant */}
        <path
          d="M80 120 A 30 30 0 0 0 140 120 A 24 24 0 0 1 80 120 Z"
          fill="#FFFFFF"
        />
        <circle cx="110" cy="115" r="10" fill="#FFFFFF" />
        {/* White sun in bottom pennant */}
        <circle cx="110" cy="330" r="28" fill="#FFFFFF" />
      </svg>
    );
  }

  if (code === "EUR") {
    // European Union Flag SVG
    return (
      <svg
        viewBox="0 0 640 480"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...props}
      >
        <path fill="#003399" d="M0 0h640v480H0z" />
        <g fill="#FFCC00" transform="translate(320,240)">
          {EU_FLAG_STARS.map((star, idx) => (
            <circle
              key={idx}
              cx={star.cx}
              cy={star.cy}
              r="12"
            />
          ))}
        </g>
      </svg>
    );
  }

  if (code === "GBP") {
    // United Kingdom Union Jack Flag SVG
    return (
      <svg
        viewBox="0 0 640 480"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...props}
      >
        <clipPath id="s">
          <path d="M0 0v480h640V0z" />
        </clipPath>
        <g clipPath="url(#s)">
          <path fill="#012169" d="M0 0v480h640V0z" />
          <path stroke="#fff" strokeWidth="60" d="M0 0l640 480M640 0L0 480" />
          <path stroke="#c8102e" strokeWidth="40" d="M0 0l640 480M640 0L0 480" />
          <path stroke="#fff" strokeWidth="100" d="M320 0v480M0 240h640" />
          <path stroke="#c8102e" strokeWidth="60" d="M320 0v480M0 240h640" />
        </g>
      </svg>
    );
  }

  // Fallback generic globe/flag placeholder
  return (
    <div className={`${className} bg-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-700`}>
      {code}
    </div>
  );
}
