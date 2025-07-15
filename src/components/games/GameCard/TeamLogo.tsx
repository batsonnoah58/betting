import React from 'react';

interface TeamLogoProps {
  logo?: string;
  name: string;
  size?: number;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ logo, name, size = 32 }) => {
  if (!logo) return <span style={{ fontSize: size }}>{'⚽'}</span>;
  // If it's a single unicode emoji, render as text
  if (/^\p{Emoji}$/u.test(logo) || logo.length <= 3) {
    return <span style={{ fontSize: size }}>{logo}</span>;
  }
  // Otherwise, treat as image URL
  return (
    <img
      src={logo}
      alt={name}
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block' }}
      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.append('⚽'); }}
    />
  );
}; 