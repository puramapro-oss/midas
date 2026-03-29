'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface AccordionItem {
  id: string
  title: string
  content: ReactNode
  icon?: ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  defaultOpen?: string[]
  className?: string
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(defaultOpen)
  )

  const toggle = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id)

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-xl border transition-colors duration-200',
              isOpen
                ? 'border-[#FFD700]/20 bg-[#FFD700]/[0.02]'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
            )}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3">
                {item.icon && (
                  <span className="text-[#FFD700]/60">{item.icon}</span>
                )}
                <span
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isOpen ? 'text-white' : 'text-white/70'
                  )}
                >
                  {item.title}
                </span>
              </span>

              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isOpen ? 'text-[#FFD700]' : 'text-white/30'
                  )}
                />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-sm text-white/60 leading-relaxed">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

Accordion.displayName = 'Accordion'
export default Accordion
