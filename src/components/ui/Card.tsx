import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  flat?: boolean;
}

export const Card: React.FC<CardProps> = ({ flat = false, className = '', children, ...rest }) => {
  return (
    <div className={`${flat ? 'card-flat' : 'card'} ${className}`} {...rest}>
      {children}
    </div>
  );
};
