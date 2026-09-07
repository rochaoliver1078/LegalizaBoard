import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[11px] px-3 py-1.5',
  md: 'text-xs px-3.5 py-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      className={`btn btn-${variant} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};
