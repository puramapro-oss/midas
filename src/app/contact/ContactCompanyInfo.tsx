'use client'

import { motion } from 'framer-motion'
import { Building2, MapPin, Mail } from 'lucide-react'
import { itemVariants } from './contact-config'

export function ContactCompanyInfo() {
  return (
    <motion.div
      variants={itemVariants}
      className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 text-center">
        <Building2 className="h-5 w-5 text-[#FFD700]/40 mx-auto mb-2" />
        <p className="text-xs font-semibold text-white/70">SASU PURAMA</p>
        <p className="text-[10px] text-white/30 mt-1">TVA non applicable, art. 293 B du CGI</p>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 text-center">
        <MapPin className="h-5 w-5 text-[#FFD700]/40 mx-auto mb-2" />
        <p className="text-xs font-semibold text-white/70">8 Rue de la Chapelle</p>
        <p className="text-[10px] text-white/30 mt-1">25560 Frasne, France</p>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 text-center">
        <Mail className="h-5 w-5 text-[#FFD700]/40 mx-auto mb-2" />
        <a
          href="mailto:purama.pro@gmail.com"
          className="text-xs font-semibold text-white/70 hover:text-[#FFD700] transition-colors"
        >
          purama.pro@gmail.com
        </a>
        <p className="text-[10px] text-white/30 mt-1">Support par email</p>
      </div>
    </motion.div>
  )
}
