export function Buho({ tamano = 72 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="42" r="24" fill="#f4f7fb" />
      <path d="M16 36c2-14 12-22 24-22s22 8 24 22" fill="#1c2433" />
      <path d="M14 38c8-4 12 2 12 8M66 38c-8-4-12 2-12 8" fill="#243044" />
      <circle cx="31" cy="42" r="8" fill="#1a2230" />
      <circle cx="49" cy="42" r="8" fill="#1a2230" />
      <circle cx="31" cy="42" r="3.2" fill="#7eb6ff" />
      <circle cx="49" cy="42" r="3.2" fill="#7eb6ff" />
      <path d="M36 50h8l-4 5z" fill="#f0a35e" />
      <path d="M22 58c6 8 30 8 36 0" fill="none" stroke="#1a2230" strokeWidth="2" />
      <path d="M28 24l-8-8M52 24l8-8" stroke="#d7deea" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
