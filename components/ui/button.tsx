import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-amber text-ink font-semibold hover:opacity-95 shadow-sm active:translate-y-0.5',
        destructive: 'bg-error text-white hover:bg-error/90 shadow-sm',
        outline: 'border border-black/10 bg-transparent text-ink hover:bg-olive-tint-soft',
        secondary: 'bg-surface text-ink hover:bg-surface-container border border-black/5 shadow-xs',
        ghost: 'text-ink-muted hover:text-ink hover:bg-olive-tint-soft',
        link: 'text-ink underline-offset-4 hover:underline',
        pill: 'bg-olive-tint-soft text-ink hover:bg-olive-tint-soft/80',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-[52px] px-8 text-base font-semibold',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
