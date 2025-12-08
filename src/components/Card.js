import { cn } from '../lib/utils.js';

export function Card({ className = '', children }) {
  const card = document.createElement('div');
  card.className = cn('rounded-lg border bg-card text-card-foreground shadow-sm', className);
  
  if (typeof children === 'string') {
    card.textContent = children;
  } else if (children instanceof Node) {
    card.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        card.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        card.appendChild(child);
      }
    });
  }
  
  return card;
}

export function CardHeader({ className = '', children }) {
  const header = document.createElement('div');
  header.className = cn('flex flex-col space-y-1.5 p-6', className);
  
  if (typeof children === 'string') {
    header.textContent = children;
  } else if (children instanceof Node) {
    header.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        header.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        header.appendChild(child);
      }
    });
  }
  
  return header;
}

export function CardTitle({ className = '', children }) {
  const title = document.createElement('h3');
  title.className = cn('text-2xl font-semibold leading-none tracking-tight', className);
  
  if (typeof children === 'string') {
    title.textContent = children;
  } else if (children instanceof Node) {
    title.appendChild(children);
  }
  
  return title;
}

export function CardContent({ className = '', children }) {
  const content = document.createElement('div');
  content.className = cn('p-6 pt-0', className);
  
  if (typeof children === 'string') {
    content.textContent = children;
  } else if (children instanceof Node) {
    content.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        content.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        content.appendChild(child);
      }
    });
  }
  
  return content;
}

