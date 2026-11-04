// components/shared/LogoMark.tsx
//
// The Meal Prep Market logo symbol: a gold outline map pin holding a
// gold bowl with three small lines of steam. Used next to the name in
// every header. The square app icon lives in app/icon.svg.

export function LogoMark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 144" className={className} aria-hidden="true" focusable="false">
      <path
        d="M60 6 C33 6 14 26 14 52 C14 86 60 136 60 136 C60 136 106 86 106 52 C106 26 87 6 60 6 Z"
        fill="none"
        stroke="#D4AF63"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path d="M36 54 H84 A24 24 0 0 1 36 54 Z" fill="#D4AF63" />
      <line x1="30" y1="54" x2="90" y2="54" stroke="#D4AF63" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 44 C46 38 54 34 50 27" fill="none" stroke="#F5EFE3" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M60 44 C56 38 64 34 60 27" fill="none" stroke="#F5EFE3" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M70 44 C66 38 74 34 70 27" fill="none" stroke="#F5EFE3" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
