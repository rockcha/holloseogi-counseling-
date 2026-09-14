import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function SidebarGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const storageKey = `holoseogi-sidebar-expanded-${id}`;
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(storageKey) !== 'false'; }
    catch { return true; }
  });
  const contentId = `sidebar-group-${id}`;
  const Icon = expanded ? ChevronUp : ChevronDown;

  return <div className="sidebar-group">
    <button type="button" className="sidebar-group-toggle" aria-expanded={expanded} aria-controls={contentId} aria-label={`${title} ${expanded ? '접기' : '펼치기'}`} onClick={() => {
      const next = !expanded;
      setExpanded(next);
      try { localStorage.setItem(storageKey, String(next)); }
      catch { /* Keep the toggle usable when storage is unavailable. */ }
    }}>
      <span>{title}</span>
      <Icon size={14} aria-hidden="true" />
    </button>
    <nav id={contentId} aria-label={title} hidden={!expanded}>{children}</nav>
  </div>;
}
