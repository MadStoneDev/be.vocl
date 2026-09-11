import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Broadsheet buttons (design/broadsheet-foundation): radius 0, uppercase Plex
// Sans labels with 0.16em tracking, no shadows. Primary is the single accent
// fill per view; hover dims to 0.88 opacity (no colour shift, no transform).
// Secondary is a 1px ink outline; ghost is a bare text action; danger outlines.
const variantClasses = {
  primary:
    'bg-accent text-white hover:opacity-[0.88] focus-visible:ring-accent',
  secondary:
    'border border-foreground text-foreground hover:bg-vocl-hover focus-visible:ring-vocl-border',
  ghost:
    'text-foreground hover:bg-vocl-hover focus-visible:ring-vocl-border',
  danger:
    'border border-vocl-like text-vocl-like hover:bg-vocl-like/10 focus-visible:ring-vocl-like',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-[11px] gap-1.5',
  md: 'px-5 py-2.5 text-xs gap-2',
  lg: 'px-6 py-3 text-xs gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center font-sans font-medium uppercase tracking-[0.16em]
          transition-opacity duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
