import React from 'react';
import type { CharacterId } from '../game/types';

export const GameLogoEmblem: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 420 150"
    className={className}
    role="img"
    aria-label="RT: O TRIO"
  >
    {/* Dark school chalkboard crest shadow */}
    <rect x="10" y="14" width="400" height="122" rx="18" fill="#0f172a" />
    {/* Outer gold school crest border */}
    <rect x="6" y="8" width="400" height="122" rx="18" fill="#1e3a5f" stroke="#facc15" strokeWidth="5" />
    {/* Brazilian school ribbon stripe */}
    <rect x="20" y="20" width="372" height="98" rx="10" fill="#172c49" stroke="#22c55e" strokeWidth="2.5" />
    {/* Three mini animal silhouettes on crest top */}
    <g transform="translate(152, 24)">
      {/* Rat ears */}
      <circle cx="14" cy="14" r="6" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
      <circle cx="28" cy="14" r="6" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
      <rect x="14" y="13" width="14" height="12" rx="4" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
      {/* Duck */}
      <rect x="48" y="12" width="16" height="14" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
      <rect x="51" y="19" width="10" height="5" rx="2" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
      {/* Harpy */}
      <polygon points="84,8 89,16 80,16" fill="#334155" />
      <polygon points="98,8 102,16 93,16" fill="#334155" />
      <rect x="83" y="13" width="16" height="13" rx="3" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
    </g>
    {/* Main Title */}
    <text
      x="206"
      y="90"
      textAnchor="middle"
      fill="#facc15"
      stroke="#0f172a"
      strokeWidth="6"
      paintOrder="stroke fill"
      fontFamily="Fredoka, sans-serif"
      fontWeight="700"
      fontSize="50"
      letterSpacing="2"
    >
      RT: O TRIO
    </text>
    {/* Sub-ribbon */}
    <rect x="64" y="102" width="284" height="20" rx="5" fill="#15803d" stroke="#0f172a" strokeWidth="2" />
    <text
      x="206"
      y="116"
      textAnchor="middle"
      fill="#fefce8"
      fontFamily="Plus Jakarta Sans, sans-serif"
      fontWeight="700"
      fontSize="10.5"
      letterSpacing="1.6"
    >
      TRÊS ANIMAIS · UMA ESCOLA · ZERO SOSSEGO
    </text>
  </svg>
);

export const CharacterPortraitSvg: React.FC<{ id: CharacterId; className?: string }> = ({
  id,
  className = 'w-12 h-12',
}) => {
  if (id === 'emanuel') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-label="Emanuel">
        <rect x="4" y="4" width="56" height="56" rx="12" fill="#0284c7" stroke="#0f172a" strokeWidth="3" />
        {/* Large rat ears */}
        <circle cx="18" cy="20" r="10" fill="#7d8594" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="18" cy="20" r="5.5" fill="#f4a5b8" />
        <circle cx="46" cy="20" r="10" fill="#7d8594" stroke="#0f172a" strokeWidth="2.5" />
        <circle cx="46" cy="20" r="5.5" fill="#f4a5b8" />
        {/* Head */}
        <rect x="16" y="20" width="32" height="28" rx="9" fill="#94a3b8" stroke="#0f172a" strokeWidth="2.5" />
        {/* Muzzle & pink nose */}
        <rect x="23" y="34" width="18" height="12" rx="5" fill="#e2e8f0" />
        <rect x="28" y="36" width="8" height="5" rx="2.5" fill="#f472b6" stroke="#0f172a" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="25" cy="29" r="3.2" fill="#0f172a" />
        <circle cx="26" cy="28" r="1.1" fill="#ffffff" />
        <circle cx="39" cy="29" r="3.2" fill="#0f172a" />
        <circle cx="40" cy="28" r="1.1" fill="#ffffff" />
      </svg>
    );
  }
  if (id === 'pedro_henrique') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-label="Pedro Henrique">
        <rect x="4" y="4" width="56" height="56" rx="12" fill="#d97706" stroke="#0f172a" strokeWidth="3" />
        {/* Cap */}
        <rect x="17" y="13" width="30" height="10" rx="4" fill="#facc15" stroke="#0f172a" strokeWidth="2.5" />
        {/* Duck head */}
        <rect x="16" y="20" width="32" height="28" rx="10" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
        {/* Eyes */}
        <circle cx="24" cy="29" r="3.2" fill="#0f172a" />
        <circle cx="25" cy="28" r="1.1" fill="#ffffff" />
        <circle cx="40" cy="29" r="3.2" fill="#0f172a" />
        <circle cx="41" cy="28" r="1.1" fill="#ffffff" />
        {/* Big Yellow Beak */}
        <rect x="19" y="34" width="26" height="11" rx="4" fill="#f59e0b" stroke="#0f172a" strokeWidth="2.2" />
        <line x1="21" y1="40" x2="43" y2="40" stroke="#0f172a" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Pedro Antonio">
      <rect x="4" y="4" width="56" height="56" rx="12" fill="#059669" stroke="#0f172a" strokeWidth="3" />
      {/* Harpy Crest */}
      <polygon points="15,24 22,9 29,22" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <polygon points="35,22 42,9 49,24" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      {/* Head */}
      <rect x="16" y="20" width="32" height="28" rx="9" fill="#64748b" stroke="#0f172a" strokeWidth="2.5" />
      {/* White ruff */}
      <rect x="17" y="38" width="30" height="10" rx="4" fill="#f1f5f9" />
      {/* Golden Eagle Eyes */}
      <circle cx="24" cy="29" r="3.3" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
      <circle cx="24" cy="29" r="1.5" fill="#0f172a" />
      <circle cx="40" cy="29" r="3.3" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
      <circle cx="40" cy="29" r="1.5" fill="#0f172a" />
      {/* Hooked Beak */}
      <polygon points="27,32 37,32 32,44" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
    </svg>
  );
};
