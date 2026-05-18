import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="text-sm text-red-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
