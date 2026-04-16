export function Shopkeeper({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="The Shopkeeper"
    >
      {/* ── Shadow ── */}
      <ellipse cx="60" cy="154" rx="28" ry="5" fill="#000" opacity="0.25" />

      {/* ── Robe / Body ── */}
      <path
        d="M28 100 C22 115 18 135 20 155 L100 155 C102 135 98 115 92 100 Z"
        fill="#2d1b69"
      />
      {/* Robe shading */}
      <path
        d="M40 100 C36 115 33 132 34 155 L60 155 L60 100 Z"
        fill="#3d2580"
        opacity="0.5"
      />
      {/* Robe highlight */}
      <path
        d="M60 100 L60 155 L86 155 C87 132 84 115 80 100 Z"
        fill="#1e1050"
        opacity="0.5"
      />
      {/* Belt */}
      <rect x="33" y="115" width="54" height="8" rx="3" fill="#8b6914" />
      <rect x="55" y="113" width="10" height="12" rx="2" fill="#c8961e" />
      <rect x="58" y="116" width="4" height="6" rx="1" fill="#8b6914" />

      {/* ── Cloak / Cape ── */}
      <path
        d="M28 75 C15 90 12 120 16 155 L30 155 C26 130 28 105 35 90 Z"
        fill="#1a0e42"
      />
      <path
        d="M92 75 C105 90 108 120 104 155 L90 155 C94 130 92 105 85 90 Z"
        fill="#1a0e42"
      />
      {/* Cloak clasp */}
      <circle cx="60" cy="82" r="5" fill="#c8961e" />
      <circle cx="60" cy="82" r="3" fill="#f5c842" />

      {/* ── Neck ── */}
      <rect x="52" y="68" width="16" height="14" rx="4" fill="#c9a87c" />

      {/* ── Head ── */}
      <ellipse cx="60" cy="54" rx="22" ry="24" fill="#c9a87c" />
      {/* Beard */}
      <path
        d="M42 65 C40 75 44 85 60 88 C76 85 80 75 78 65 C72 70 65 72 60 72 C55 72 48 70 42 65 Z"
        fill="#a07830"
      />
      {/* Beard highlight */}
      <path
        d="M50 68 C50 76 54 82 60 84 C55 80 52 74 50 68 Z"
        fill="#c09040"
        opacity="0.5"
      />
      {/* Moustache */}
      <path
        d="M50 62 C53 59 57 60 60 61 C63 60 67 59 70 62 C67 65 63 64 60 63 C57 64 53 65 50 62 Z"
        fill="#7a5c20"
      />

      {/* ── Face features ── */}
      {/* Eyes */}
      <ellipse cx="52" cy="50" rx="4.5" ry="4" fill="white" />
      <ellipse cx="68" cy="50" rx="4.5" ry="4" fill="white" />
      <ellipse cx="53" cy="51" rx="2.5" ry="2.5" fill="#3a2010" />
      <ellipse cx="69" cy="51" rx="2.5" ry="2.5" fill="#3a2010" />
      {/* Eye glints */}
      <circle cx="54.5" cy="50" r="0.8" fill="white" />
      <circle cx="70.5" cy="50" r="0.8" fill="white" />
      {/* Eyebrows */}
      <path d="M48 44 C50 42 55 42 57 44" stroke="#7a5c20" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M63 44 C65 42 70 42 72 44" stroke="#7a5c20" strokeWidth="1.5" strokeLinecap="round" />
      {/* Nose */}
      <path d="M58 54 C58 58 62 58 62 54" stroke="#b08060" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Wrinkle / smile lines */}
      <path d="M48 58 C46 62 48 66 52 66" stroke="#b08060" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M72 58 C74 62 72 66 68 66" stroke="#b08060" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* ── Hat ── */}
      {/* Brim */}
      <ellipse cx="60" cy="32" rx="27" ry="6" fill="#1a0e42" />
      {/* Cone */}
      <path d="M36 32 L50 2 L70 2 L84 32 Z" fill="#2d1b69" />
      <path d="M50 2 L55 32 L36 32 Z" fill="#3d2580" opacity="0.4" />
      {/* Hat band */}
      <rect x="36" y="29" width="48" height="6" rx="1" fill="#8b6914" opacity="0.8" />
      {/* Star on hat */}
      <path
        d="M60 10 L61.5 14.5 L66 14.5 L62.5 17 L64 21.5 L60 19 L56 21.5 L57.5 17 L54 14.5 L58.5 14.5 Z"
        fill="#f5c842"
      />

      {/* ── Arms / Hands ── */}
      {/* Left arm holding scroll */}
      <path d="M28 100 C20 105 16 112 18 120 L30 118 C29 112 30 106 35 103 Z" fill="#2d1b69" />
      <ellipse cx="18" cy="122" rx="7" ry="6" fill="#c9a87c" />
      {/* Scroll */}
      <rect x="4" y="115" width="18" height="25" rx="3" fill="#f0e0b0" />
      <rect x="4" y="115" width="18" height="4" rx="2" fill="#c8961e" />
      <rect x="4" y="136" width="18" height="4" rx="2" fill="#c8961e" />
      <line x1="8" y1="123" x2="18" y2="123" stroke="#a08040" strokeWidth="0.8" />
      <line x1="8" y1="127" x2="18" y2="127" stroke="#a08040" strokeWidth="0.8" />
      <line x1="8" y1="131" x2="15" y2="131" stroke="#a08040" strokeWidth="0.8" />

      {/* Right arm pointing */}
      <path d="M92 100 C100 105 104 112 102 120 L90 118 C91 112 90 106 85 103 Z" fill="#2d1b69" />
      <ellipse cx="102" cy="122" rx="7" ry="6" fill="#c9a87c" />
      {/* Pointing finger */}
      <path d="M100 118 L108 112 L110 115 L103 122 Z" fill="#c9a87c" />

      {/* ── Magic sparkles ── */}
      <circle cx="110" cy="105" r="2" fill="#f5c842" opacity="0.9" />
      <circle cx="115" cy="112" r="1.2" fill="#a78bfa" opacity="0.8" />
      <circle cx="108" cy="118" r="1.5" fill="#67e8f9" opacity="0.7" />
      <circle cx="112" cy="98" r="1" fill="#f5c842" opacity="0.6" />
    </svg>
  )
}
