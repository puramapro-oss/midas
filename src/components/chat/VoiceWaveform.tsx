'use client'

import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/formatters'

export interface VoiceWaveformProps {
  analyserNode: AnalyserNode | null
  isActive: boolean
  color?: string
  className?: string
}

export function VoiceWaveform({
  analyserNode,
  isActive,
  color = '#F59E0B',
  className,
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const phaseRef = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const centerY = height / 2

    ctx.clearRect(0, 0, width, height)

    if (isActive && analyserNode) {
      const bufferLength = analyserNode.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserNode.getByteFrequencyData(dataArray)

      // Draw frequency bars as smooth wave
      const barCount = 64
      const barWidth = width / barCount
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step
        const value = dataArray[dataIndex] ?? 0
        const normalizedValue = value / 255
        const barHeight = normalizedValue * (height * 0.8)

        const x = i * barWidth
        const alpha = 0.3 + normalizedValue * 0.7

        ctx.fillStyle = hexToRgba(color, alpha)
        ctx.beginPath()
        ctx.roundRect(
          x + 1,
          centerY - barHeight / 2,
          Math.max(barWidth - 2, 1),
          Math.max(barHeight, 2),
          2
        )
        ctx.fill()
      }
    } else {
      // Idle: subtle sine wave pulse
      phaseRef.current += 0.02
      const phase = phaseRef.current

      ctx.beginPath()
      ctx.strokeStyle = hexToRgba(color, 0.2)
      ctx.lineWidth = 2

      for (let x = 0; x < width; x++) {
        const progress = x / width
        const amplitude = 3 + Math.sin(phase) * 2
        const y = centerY + Math.sin(progress * Math.PI * 4 + phase) * amplitude
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [analyserNode, isActive, color])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-20', className)}
      data-testid="voice-waveform"
    />
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

VoiceWaveform.displayName = 'VoiceWaveform'
export default VoiceWaveform
