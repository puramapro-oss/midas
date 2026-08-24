import { z } from 'zod/v4'

/**
 * Schéma de validation formulaire d'inscription
 * Extrait de page.tsx pour réduire sa taille
 */
export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
    email: z.string().email('Adresse email invalide'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
      .regex(/[A-Z]/, 'Au moins une majuscule requise')
      .regex(/[0-9]/, 'Au moins un chiffre requis'),
    confirmPassword: z.string(),
    acceptCgu: z.literal(true, 'Vous devez accepter les CGU'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
