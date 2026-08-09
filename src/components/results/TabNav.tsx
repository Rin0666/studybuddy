import { useEffect, useRef } from "react";
import { clsx } from "clsx";

export interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab);
    if (activeIndex === -1) return;

    let nextIndex = activeIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (activeIndex + 1) % tabs.length;
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
      e.preventDefault();
    } else if (e.key === "Home") {
      nextIndex = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
      e.preventDefault();
    }

    if (nextIndex !== activeIndex) {
      onChange(tabs[nextIndex].id);
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const activeButton = listRef.current.querySelector<HTMLButtonElement>(
      `[aria-selected="true"]`
    );
    activeButton?.focus({ preventScroll: true });
  }, [activeTab]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Study results"
      onKeyDown={handleKeyDown}
      className="relative flex gap-1 overflow-x-auto sm:overflow-visible p-1 bg-muted/60 rounded-2xl border border-border"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "relative flex-1 min-w-[5.5rem] inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "bg-white text-primary shadow-sm"
                : "text-foreground/70 hover:text-foreground hover:bg-white/60"
            )}
          >
            {tab.icon}
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
