// Evermo's mark: a ring (the agent, which goes on) woven through a chip (its circuit, which holds the rules).
import { useId } from "react";

export function Logo({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="6" y1="14" x2="34" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#FFB04A" /><stop offset="1" stopColor="#E8501A" /></linearGradient>
        <linearGradient id={`${id}b`} x1="58" y1="14" x2="30" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#B07648" /><stop offset="1" stopColor="#4A2A16" /></linearGradient>
        <clipPath id={`${id}t`}><rect x="0" y="0" width="64" height="32" /></clipPath>
      </defs>
      <rect x="27" y="17" width="30" height="30" rx="9" fill="none" stroke={`url(#${id}b)`} strokeWidth="8" />
      <circle cx="23" cy="32" r="15" fill="none" stroke={`url(#${id}a)`} strokeWidth="8" />
      <g clipPath={`url(#${id}t)`}><rect x="27" y="17" width="30" height="30" rx="9" fill="none" stroke={`url(#${id}b)`} strokeWidth="8" /></g>
      <circle cx="47.5" cy="32" r="3.6" fill="#FFC56B" />
    </svg>
  );
}
