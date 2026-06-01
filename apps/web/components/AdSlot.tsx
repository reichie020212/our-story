import type { CSSProperties, ReactNode } from "react";

// Ad slots are placeholder reservations for the eventual ad network. They only
// render when NEXT_PUBLIC_ADS_ENABLED === "true" (set in dev to preview layout);
// production stays clean until real ad units are wired in. NEXT_PUBLIC_* is
// inlined at build time, so this works in both server and client components.
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

export function AdSlot({
  className,
  children,
  style,
}: {
  className: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  if (!ADS_ENABLED) return null;
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
