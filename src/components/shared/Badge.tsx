import React from 'react';
import { ActionIcon, getAccentBadgeStyle, getAccentClassName } from './ActionIcon';

export interface BadgeProps {
  label: string;
  color?: string;
  iconName?: string;
  iconSize?: number;
  className?: string;
}

/**
 * SPEC.md § IX & token_design.md — Micro-Badge:
 * Compact inline container with monospace text and a 2px color-coded left stroke
 * corresponding to the activity accent (Terracotta, Lavender, Mint, Chartreuse, or custom hex).
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  color = 'chartreuse',
  iconName,
  iconSize = 15,
  className = '',
}) => {
  const accentClass = getAccentClassName(color);
  const accentStyle = getAccentBadgeStyle(color);

  return (
    <span
      className={`tap-tile-badge ${accentClass} ${className}`.trim()}
      style={accentStyle}
    >
      {iconName ? <ActionIcon name={iconName} size={iconSize} /> : null}
      <span className="type-mono-badge">{label}</span>
    </span>
  );
};

export default Badge;
