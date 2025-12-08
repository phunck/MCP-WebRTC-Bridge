import { cn } from '../lib/utils.js';

export function Button({ 
  variant = 'default', 
  size = 'default', 
  className = '', 
  children, 
  onClick,
  disabled = false,
  id = null
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };
  
  const button = document.createElement('button');
  button.className = cn(baseStyles, variants[variant], sizes[size], className);
  button.disabled = disabled;
  if (id) button.id = id;
  if (onClick) button.addEventListener('click', onClick);
  
  if (typeof children === 'string') {
    button.textContent = children;
  } else if (children instanceof Node) {
    button.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        button.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        button.appendChild(child);
      }
    });
  }
  
  return button;
}

