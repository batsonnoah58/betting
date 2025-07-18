import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-card animate-fade-in animate-scale-in focus:shadow-glow hover:shadow-glow hover:-translate-y-0.5 active:scale-95 transition-shadow transition-transform",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-betting hover:shadow-glow focus:bg-primary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:bg-destructive/80 border border-destructive/40",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground focus:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline focus:underline",
        betting: "bg-betting-background border border-primary/20 text-foreground hover:bg-betting-hover hover:border-primary/40 hover:shadow-betting focus:bg-betting-hover transition-all duration-200",
        success: "bg-success text-success-foreground hover:bg-success/90 focus:bg-success/80 shadow-sm border border-success/40",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 focus:bg-warning/80 shadow-sm",
        gradient: "bg-gradient-primary text-primary-foreground hover:shadow-glow transform hover:scale-105 focus:scale-100 transition-all duration-200",
        wallet: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/80 animate-pulse-glow"
      },
      size: {
        default: "h-11 px-6 py-2 text-base",
        sm: "h-9 rounded-full px-4 text-sm",
        lg: "h-12 rounded-full px-8 text-lg",
        xl: "h-14 rounded-full px-10 text-xl",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export { buttonVariants }; 