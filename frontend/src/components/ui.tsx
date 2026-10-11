import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { X } from 'lucide-react';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  return <button className={'sh-btn sh-btn--' + variant + ' sh-btn--' + size + ' ' + className} {...props} disabled={props.disabled || loading}>
    {loading && <span className="sh-spinner" aria-hidden="true" />}{children}
  </button>;
}
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button className="sh-icon-btn" aria-label={label} title={label} {...props}>{children}</button>;
}
export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return <span className={'sh-badge sh-badge--' + tone}>{dot && <span className="sh-badge__dot" aria-hidden="true" />}{children}</span>;
}
type PanelProps = HTMLAttributes<HTMLElement> & { title?: string; subtitle?: string; action?: ReactNode };
export function Panel({ children, className = '', title, subtitle, action, ...props }: PanelProps) {
  const hasHeader = Boolean(title || subtitle || action);
  return <section className={'panel ' + className} {...props}>
    {hasHeader && <div className="panel-header"><div>{title && <h3>{title}</h3>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
    {hasHeader ? <div className="panel-body">{children}</div> : children}
  </section>;
}
export function Field({ label, hint, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; id: string }) {
  return <div className="sh-field">
    <label htmlFor={id}>{label}</label>
    <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? id + '-error' : hint ? id + '-hint' : undefined} {...props} />
    {error && <p className="sh-field__error" id={id + '-error'}>{error}</p>}
    {!error && hint && <p className="sh-field__hint" id={id + '-hint'}>{hint}</p>}
  </div>;
}
export function SelectField({ label, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string }) {
  return <div className="sh-field"><label htmlFor={id}>{label}</label><select id={id} {...props}>{children}</select></div>;
}
export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="sh-tabs" role="tablist" aria-label="Preview views">
    {items.map(item => <button key={item} role="tab" aria-selected={value === item} className={value === item ? 'is-active' : ''} onClick={() => onChange(item)}>{item}</button>)}
  </div>;
}
export function StatusBanner({ tone = 'info', title, children }: { tone?: Tone; title: string; children: ReactNode }) {
  return <div className={'sh-banner sh-banner--' + tone} role={tone === 'danger' ? 'alert' : 'status'}><strong>{title}</strong><span>{children}</span></div>;
}
export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="sh-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="sh-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sh-drawer__head"><h2>{title}</h2><IconButton label="Close panel" onClick={onClose}><X size={18} /></IconButton></div>
      <div className="sh-drawer__body">{children}</div>
    </aside>
  </div>;
}