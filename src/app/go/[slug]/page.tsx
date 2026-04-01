import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MIDAS — Redirection',
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function GoPage({ params }: Props) {
  const { slug } = await params

  // Track the referral/influencer click server-side
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://midas.purama.dev'
    await fetch(`${baseUrl}/api/referral/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, source: 'go_link' }),
    }).catch(() => {})
  } catch {
    // Non-blocking — don't fail redirect if tracking fails
  }

  redirect(`/register?ref=${encodeURIComponent(slug)}`)
}
