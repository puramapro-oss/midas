'use client'

import { Modal, type ModalProps } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/formatters'

export interface DialogProps extends Omit<ModalProps, 'children'> {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  destructive?: boolean
  loading?: boolean
}

export function Dialog({
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
  onClose,
  ...modalProps
}: DialogProps) {
  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <Modal onClose={onClose} size="sm" {...modalProps}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {destructive && (
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'text-lg font-semibold font-[family-name:var(--font-orbitron)]',
                destructive ? 'text-red-400' : 'text-white'
              )}
            >
              {title}
            </h3>
            {description && (
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

Dialog.displayName = 'Dialog'
export default Dialog
