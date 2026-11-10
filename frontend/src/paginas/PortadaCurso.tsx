export function PortadaCurso({ compacta = false }: { compacta?: boolean }) {
  const cielo = compacta ? 'cielo-curso-mini' : 'cielo-curso'
  return (
    <div className={compacta ? 'portada-curso compacta' : 'portada-curso'} aria-hidden="true">
      <svg viewBox="0 0 960 280" preserveAspectRatio="xMinYMid meet">
        <defs>
          <linearGradient id={cielo} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2a0d55" />
            <stop offset="0.42" stopColor="#12345c" />
            <stop offset="1" stopColor="#071018" />
          </linearGradient>
          <linearGradient id={`${cielo}-panel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#12324f" />
            <stop offset="1" stopColor="#0b1824" />
          </linearGradient>
        </defs>
        <rect width="960" height="280" fill={`url(#${cielo})`} />
        <g opacity="0.35" stroke="#7c5cff" fill="none">
          {Array.from({ length: 8 }, (_, indice) => (
            <path key={indice} d={`M0 ${40 + indice * 28}h960`} />
          ))}
        </g>
        <g fill="none" stroke="#3ee0ff" strokeWidth="1.6">
          <path d="M28 230h150l36-86h70l22 86h110" />
          <path d="M58 230V146h46v84M122 230V108h34v122M188 230V162h28v68" />
          <path d="M48 168h18M78 168h18M108 132h16M138 132h16" opacity="0.7" />
        </g>
        <g transform="translate(500 62) scale(0.72)">
          <path d="M70 150c-36 0-62-18-78-42 18-8 28-22 28-40 0-28 22-48 50-48 8-22 28-34 50-30 16 2 28 12 34 26 22-2 42 12 48 32 2 8 2 16 0 24 16 10 26 28 24 48-4 28-30 48-62 48H70z" fill="#140c28" />
          <path d="M78 78c8-28 34-40 58-28 10 6 16 16 18 26" fill="none" stroke="#24143f" strokeWidth="10" />
          <rect x="62" y="92" width="34" height="18" rx="6" fill="#061018" stroke="#3ee0ff" />
          <rect x="108" y="92" width="34" height="18" rx="6" fill="#061018" stroke="#3ee0ff" />
          <path d="M96 100h12" stroke="#3ee0ff" />
          <path d="M46 168c18 28 110 28 132 0v42H46z" fill="#1a1030" />
          <path d="M78 168v42M146 168v42" stroke="#7c5cff" opacity="0.8" />
        </g>
        <g>
          <rect x="620" y="36" width="250" height="168" rx="18" fill={`url(#${cielo}-panel)`} stroke="#3ee0ff" strokeOpacity="0.45" />
          <path d="M648 92h70l16-22 16 22h62" fill="none" stroke="#7dffa8" strokeWidth="2" />
          <circle cx="648" cy="92" r="5" fill="#7dffa8" />
          <circle cx="812" cy="92" r="5" fill="#f5c84b" />
          <path d="M668 128h48v28h-48zM736 128h48v28h-48z" fill="none" stroke="#3ee0ff" />
          <path d="M716 142h20" stroke="#f5c84b" strokeWidth="2" />
          <text x="642" y="64" fill="#f5c84b" fontSize="13" fontFamily="Segoe UI, sans-serif">CONCURRENTE / PARALELO</text>
          <text x="642" y="184" fill="#7dffa8" fontSize="13" fontFamily="Segoe UI, sans-serif">LÓGICO / DECLARATIVO</text>
        </g>
        {compacta ? (
          <>
            <text x="36" y="118" fill="#f4fbff" fontSize="34" fontWeight="700" fontFamily="Segoe UI, sans-serif">PARADIGMAS</text>
            <text x="36" y="156" fill="#d7c4ff" fontSize="28" fontWeight="700" fontFamily="Segoe UI, sans-serif">DE PROGRAMACIÓN</text>
            <text x="36" y="188" fill="#9ae7ff" fontSize="14" letterSpacing="3" fontFamily="Segoe UI, sans-serif">CURSO UNIVERSITARIO</text>
          </>
        ) : (
          <>
            <text x="36" y="78" fill="#f4fbff" fontSize="42" fontWeight="800" fontFamily="Segoe UI, sans-serif">PROGRAMACIÓN</text>
            <text x="36" y="104" fill="#9ae7ff" fontSize="14" letterSpacing="3" fontFamily="Segoe UI, sans-serif">CURSO UNIVERSITARIO</text>
          </>
        )}
        <text x="36" y="248" fill="#d7c4ff" fontSize="13" fontFamily="Segoe UI, sans-serif">FUNCIONAL</text>
      </svg>
    </div>
  )
}
