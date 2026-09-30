import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4', {
  variants: {
    variant: { default: 'bg-primary text-primary-foreground hover:bg-primary/90', outline: 'border border-input bg-transparent hover:bg-accent', ghost: 'hover:bg-accent', destructive: 'bg-destructive text-white hover:bg-destructive/90' },
    size: { default: 'h-12 px-5', sm: 'h-9 px-3', icon: 'h-10 w-10' },
  }, defaultVariants: { variant: 'default', size: 'default' },
});
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';
export { Button, buttonVariants };
