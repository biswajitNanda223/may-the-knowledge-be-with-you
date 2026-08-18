import type { ReactNode } from "react";
export type IconName =
  | "ask"
  | "map"
  | "source"
  | "activity"
  | "search"
  | "send"
  | "minimize"
  | "maximize"
  | "upload"
  | "close";
const paths: Record<IconName, ReactNode> = {
  ask: (
    <>
      <path d="M7 8h10M7 12h6" />
      <path d="M5 19l2.8-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1.8" />
    </>
  ),
  map: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="14" cy="18" r="2" />
      <path d="M8 7l8-1M7.4 8.5l5.2 8M17 8l-2 8" />
    </>
  ),
  source: (
    <>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  activity: <path d="M3 12h4l2.2-6 4.2 12 2.2-6H21" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  send: (
    <>
      <path d="m21 3-7.4 18-3.3-7.3L3 10.4 21 3Z" />
      <path d="m10.3 13.7 4.4-4.4" />
    </>
  ),
  minimize: <path d="M6 12h12" />,
  maximize: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
  upload: (
    <>
      <path d="M12 16V4m0 0L7 9m5-5 5 5" />
      <path d="M5 14v5h14v-5" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
