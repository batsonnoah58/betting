import React from 'react';
import { Button } from './button';
import { Link } from 'react-router-dom';

interface ActionButtonProps {
  type?: 'button' | 'link';
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'lg';
  icon?: React.ComponentType<React.ComponentProps<'svg'>>;
  label: string;
  onClick?: () => void;
  to?: string;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  type = 'button',
  variant = 'default',
  size = 'sm',
  icon: Icon,
  label,
  onClick,
  to,
  className = '',
}) => {
  const buttonClasses = `flex items-center justify-center space-x-2 ${className}`;

  if (type === 'link' && to) {
    return (
      <Link to={to} className={buttonClasses}>
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={buttonClasses}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </Button>
  );
};
