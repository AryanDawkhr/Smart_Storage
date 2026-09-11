"use client";

import { forwardRef } from 'react';

export const Button = forwardRef(function Button({ variant = 'default', size = 'default', className = '', ...props }, ref) {
  return <button ref={ref} className={`ui-button ui-button-${variant} ui-button-${size} ${className}`} {...props} />;
});

export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`ui-badge ui-badge-${tone} ${className}`}>{children}</span>;
}

export function Card({ children, className = '' }) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function CardHeader({ title, description, action }) {
  return <div className="ui-card-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

export function Input({ className = '', ...props }) {
  return <input className={`ui-input ${className}`} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={`ui-input ${className}`} {...props} />;
}

export function Progress({ value = 0, tone = 'default' }) {
  return <div className={`ui-progress ui-progress-${tone}`}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Separator() { return <div className="ui-separator" />; }
