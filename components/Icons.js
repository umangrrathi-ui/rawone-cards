const P = {
  call: (
    <path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12.4 12.4 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a2.1 2.1 0 0 1-2.3 2.1C10.6 18.9 5.1 13.4 4.5 5.8a2.1 2.1 0 0 1 2.1-2.3Z" />
  ),
  whatsapp: (
    <>
      <path d="M4.2 20l1.1-3.9A8.3 8.3 0 1 1 8.4 19z" />
      <path d="M9.3 8.4c.2-.5.6-.5.9-.5h.4l.9 2.1-.6.8a5.4 5.4 0 0 0 2.4 2.4l.8-.6 2.1.9v.4c0 .3 0 .7-.5.9-1.6.8-6.3-1.6-6.4-5.8 0-.2 0-.4 0-.6z" />
    </>
  ),
  save: (
    <>
      <circle cx="10" cy="8" r="3.6" />
      <path d="M3.5 20c.5-3.8 3.1-6 6.5-6 1.5 0 2.9.4 4 1.2" />
      <path d="M18 14v6M15 17h6" />
    </>
  ),
  maps: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.6" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17" cy="7" r=".6" fill="currentColor" />
    </>
  ),
  email: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z" />
    </>
  ),
  share: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7.8 7.6 4.2-4.1 4.2 4.1" />
      <path d="M8 11H6.5a2 2 0 0 0-2 2v5.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13a2 2 0 0 0-2-2H16" />
    </>
  ),
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  linkedin: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3.2" />
      <path d="M8.2 10.4v5.6M8.2 7.9v.1M11.6 16v-3.2c0-1.4.9-2.3 2.1-2.3s1.9.9 1.9 2.3V16M11.6 10.4V16" />
    </>
  ),
  facebook: <path d="M14.5 21v-7.2h2.6l.4-3.1h-3V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.5a20 20 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.2H8.6v3.1h2.7V21" />,
  youtube: (
    <>
      <rect x="2.8" y="5.8" width="18.4" height="12.4" rx="3.6" />
      <path d="m10.2 9.4 4.6 2.6-4.6 2.6z" />
    </>
  ),
  x: <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" />,
  flag: <path d="M5.5 20.5v-16M5.5 4.5h10l-2 4 2 4h-10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  nfc: (
    <>
      <path d="M8.5 8.5a5 5 0 0 1 0 7" />
      <path d="M11.8 6a8.6 8.6 0 0 1 0 12" />
      <path d="M15.1 3.5a12.2 12.2 0 0 1 0 17" />
      <circle cx="5.2" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
};

export function Icon({ name, size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  );
}
