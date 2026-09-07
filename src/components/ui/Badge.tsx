import React from 'react';

type Tone = 'neutral' | 'danger' | 'warning' | 'success';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className = '', children, ...rest }) => {
  return (
    <span className={`badge badge-${tone} ${className}`} {...rest}>
      {children}
    </span>
  );
};
