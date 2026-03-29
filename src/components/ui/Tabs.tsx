'use client'

import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/formatters'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
}

export interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  onChange?: (tabId: string) => void
  children?: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export function Tabs({
  tabs,
  activeTab: controlledActive,
  onChange,
  children,
  className,
  size = 'md',
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '')
  const activeTab = controlledActive ?? internalActive

  const handleChange = (id: string) => {
    setInternalActive(id)
    onChange?.(id)
  }

  return (
    <div className={className}>
      <div
        className={cn(
          'relative flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChange(tab.id)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors z-10',
                size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2',
                isActive
                  ? 'text-[#0A0A0F]'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-lg bg-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.2)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                      isActive
                        ? 'bg-[#0A0A0F]/20 text-[#0A0A0F]'
                        : 'bg-white/10 text-white/50'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {children && (
        <div className="mt-4" role="tabpanel">
          {children}
        </div>
      )}
    </div>
  )
}

Tabs.displayName = 'Tabs'
export default Tabs
