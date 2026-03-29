'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn, getInitials, stringToColor } from '@/lib/utils/formatters'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: AvatarSize
  showBorder?: boolean
  className?: string
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; imgSize: number }> = {
  xs: { container: 'w-6 h-6', text: 'text-[8px]', imgSize: 24 },
  sm: { container: 'w-8 h-8', text: 'text-[10px]', imgSize: 32 },
  md: { container: 'w-10 h-10', text: 'text-xs', imgSize: 40 },
  lg: { container: 'w-12 h-12', text: 'text-sm', imgSize: 48 },
  xl: { container: 'w-16 h-16', text: 'text-lg', imgSize: 64 },
}

export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  showBorder = true,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const config = sizeStyles[size]
  const initials = getInitials(name || alt || '?')
  const bgColor = stringToColor(name || alt || 'default')
  const showImage = src && !imgError

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden shrink-0',
        config.container,
        showBorder && 'ring-2 ring-[#FFD700]/20',
        className
      )}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt || name}
          width={config.imgSize}
          height={config.imgSize}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center font-semibold text-white',
            config.text
          )}
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}

Avatar.displayName = 'Avatar'
export default Avatar
