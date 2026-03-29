'use client'

import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

export function MidasToaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#111116',
          border: '1px solid rgba(255,255,255,0.06)',
          color: '#F8FAFC',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          fontSize: '14px',
        },
      }}
      richColors
    />
  )
}

export const toast = {
  success: (message: string, options?: { description?: string }) => {
    sonnerToast.success(message, {
      description: options?.description,
      icon: <CheckCircle className="h-5 w-5 text-emerald-400" />,
      style: {
        background: '#111116',
        border: '1px solid rgba(16,185,129,0.2)',
        color: '#F8FAFC',
        borderRadius: '12px',
      },
    })
  },

  error: (message: string, options?: { description?: string }) => {
    sonnerToast.error(message, {
      description: options?.description,
      icon: <XCircle className="h-5 w-5 text-red-400" />,
      style: {
        background: '#111116',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#F8FAFC',
        borderRadius: '12px',
      },
    })
  },

  warning: (message: string, options?: { description?: string }) => {
    sonnerToast.warning(message, {
      description: options?.description,
      icon: <AlertTriangle className="h-5 w-5 text-orange-400" />,
      style: {
        background: '#111116',
        border: '1px solid rgba(249,115,22,0.2)',
        color: '#F8FAFC',
        borderRadius: '12px',
      },
    })
  },

  info: (message: string, options?: { description?: string }) => {
    sonnerToast.info(message, {
      description: options?.description,
      icon: <Info className="h-5 w-5 text-cyan-400" />,
      style: {
        background: '#111116',
        border: '1px solid rgba(6,182,212,0.2)',
        color: '#F8FAFC',
        borderRadius: '12px',
      },
    })
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      style: {
        background: '#111116',
        border: '1px solid rgba(255,215,0,0.2)',
        color: '#F8FAFC',
        borderRadius: '12px',
      },
    })
  },

  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id)
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      style: {
        background: '#111116',
        border: '1px solid rgba(255,255,255,0.06)',
        color: '#F8FAFC',
        borderRadius: '12px',
      },
    })
  },
}

export default toast
