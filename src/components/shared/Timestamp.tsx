import React from 'react';
import { formatTime } from '../../lib/time';

export interface TimestampProps {
  isoString: string;
  elapsedText?: string | null;
  variant?: 'metric' | 'label' | 'badge';
  highlight?: boolean;
}

/**
 * SPEC.md § IX & token_design.md — JetBrains Mono formatted time (e.g. "14:02" and optional "+24M" delta).
 */
export const Timestamp: React.FC<TimestampProps> = ({
  isoString,
  elapsedText,
  variant = 'metric',
  highlight = true,
}) => {
  const formattedTime = formatTime(isoString);

  const typeClass =
    variant === 'badge'
      ? 'type-mono-badge'
      : variant === 'label'
        ? 'type-mono-label'
        : 'type-mono-metric';

  const colorClass = highlight ? 'text-acid' : 'text-muted';

  return (
    <span className="timeline-timestamp-group">
      {elapsedText ? (
        <span className="type-mono-badge text-secondary" aria-label={`Khoảng cách ${elapsedText}`}>
          {elapsedText}
        </span>
      ) : null}
      <time
        dateTime={isoString}
        className={`${typeClass} ${colorClass}`.trim()}
      >
        {formattedTime}
      </time>
    </span>
  );
};

export default Timestamp;
