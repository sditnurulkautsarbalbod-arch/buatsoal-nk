import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg': variant === 'default',
            'border-2 border-slate-200 dark:border-slate-800 bg-transparent hover:border-indigo-300 dark:hover:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 text-slate-700 dark:text-slate-300': variant === 'outline',
            'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-400': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none': variant === 'danger',
            'h-11 px-4 py-2': size === 'default',
            'h-9 rounded-lg px-3': size === 'sm',
            'h-12 rounded-xl px-8 text-base': size === 'lg',
            'h-11 w-11': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
