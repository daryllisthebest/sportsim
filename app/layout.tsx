import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SportSim',
  description: 'AI-powered sports match simulation',
  other: {
    monetag: 'f9c9ada02fa54e94b1ecb2673d7d183f',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(s){s.dataset.zone='11001218',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))` }} />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600 px-4">
          SportSim is for entertainment purposes only. Simulation results may not predict outcomes with 100% accuracy as circumstances change from time to time, such as weather conditions, player injuries, and team form.
          We do not encourage, promote, or facilitate gambling in any form.
        </footer>
      </body>
    </html>
  )
}
