import React from 'react';

const ICONS: Record<string, React.ReactNode> = {
  dumbbell: <path strokeLinecap="round" strokeLinejoin="round" d="M10 5l-1.8 1.8M10 5l1.8 1.8M10 5v14m-4-3h8m-8 0v-2h8v2m-8 0H5.5m9 0H18.5m-13-10h13M4 10l-1.8-1.8M4 10l1.8-1.8M20 10l-1.8-1.8M20 10l1.8-1.8" />,
  history: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'clipboard-list': <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-2-2h2m-4 4h4m-4 4h4m-4 4h4" />,
  user: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  ellipsis: <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
  minus: <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
  trophy: <path strokeLinecap="round" strokeLinejoin="round" d="M11.983 1.905c.144-.28.46-.455.787-.455s.643.176.787.455l1.455 2.946 3.25.472c.31.045.548.33.548.644 0 .193-.087.37-.23.493l-2.35 2.29.555 3.236c.053.308-.14.603-.43.693-.11.034-.225.043-.335.043-.195 0-.385-.07-.53-.205L12 13.91l-2.906 1.527c-.255.134-.57.07-.745-.15-.1-.13-.14-.29-.11-.444l.555-3.236-2.35-2.29c-.143-.123-.23-.3-.23-.493 0-.314.238-.6.548-.644l3.25-.472L11.983 1.905zM3 21h18" />,
  'arrow-up': <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />,
  'arrow-down': <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />,
  'arrow-right': <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />,
  share: <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002L15.316 6.342m-6.632 6.002a3 3 0 100-2.684" />,
  edit: <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />,
  filter: <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L12 14.414V19a1 1 0 01-1.447.894L7 18.293V14.414L3.293 6.707A1 1 0 013 6V4z" />,
  search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  'question-mark-circle': <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  play: <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  pause: <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: keyof typeof ICONS;
}

export const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
  const defaultClasses = "w-6 h-6";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${defaultClasses} ${className || ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      {ICONS[name]}
    </svg>
  );
};