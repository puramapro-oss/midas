/**
 * Contact — Configuration et helpers
 * Extrait de page.tsx pour réduire sa taille
 */

export interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

export interface FormErrors {
  name?: string
  email?: string
  subject?: string
  message?: string
}

export function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim()) errors.name = 'Le nom est requis'
  if (!data.email.trim()) errors.email = 'L\'email est requis'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = 'Email invalide'
  if (!data.subject.trim()) errors.subject = 'Le sujet est requis'
  if (!data.message.trim()) errors.message = 'Le message est requis'
  else if (data.message.trim().length < 10)
    errors.message = 'Le message doit faire au moins 10 caractères'
  return errors
}

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.6,
  duration: 1.5 + Math.random() * 1.5,
  size: 3 + Math.random() * 5,
  yOffset: Math.random() * 200,
}))
