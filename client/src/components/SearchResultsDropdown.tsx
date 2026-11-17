import { ArrowUpRight, FileText, Package, Users, type LucideIcon } from 'lucide-react';

export type SearchResultItem = {
  id: string;
  title: string;
  detail: string;
  path: string;
};

export type SearchResultGroup = {
  title: 'Invoices' | 'Customers' | 'Products';
  icon: LucideIcon;
  items: SearchResultItem[];
};

export function SearchResultsDropdown({
  open,
  query,
  groups,
  onSelect,
}: {
  open: boolean;
  query: string;
  groups: SearchResultGroup[];
  onSelect: (path: string) => void;
}) {
  if (!open || !query.trim()) return null;

  const hasResults = groups.some(group => group.items.length > 0);
  if (!hasResults) {
    return (
      <div className="search-results">
        <div className="no-search">No matching invoices, customers or products.</div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {groups.filter(group => group.items.length > 0).map(group => {
        const Icon = group.icon;

        return (
          <div className="search-group" key={group.title}>
            <div className="search-category-header">
              <span className="search-category-icon"><Icon size={12} /></span>
              {group.title}
            </div>
            {group.items.map(item => (
              <button key={`${group.title}-${item.id}`} onClick={() => onSelect(item.path)}>
                <span className="search-type">{group.title.slice(0, -1)}</span>
                <span>
                  <b>{item.title}</b>
                  <small>{item.detail}</small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
