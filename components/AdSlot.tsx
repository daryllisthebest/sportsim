'use client'

import Script from 'next/script'

export function LeaderboardAd() {
  return (
    <div className="ad-slot ad-leaderboard hidden md:flex w-full max-w-[728px] h-[90px] mx-auto items-center justify-center">
      <Script id="leaderboard-ad-options" strategy="afterInteractive">{`
        atOptions = {
          'key' : '6ed74dd764a1f6932099250c6d3b1645',
          'format' : 'iframe',
          'height' : 90,
          'width' : 728,
          'params' : {}
        };
      `}</Script>
      <Script
        src="https://www.highperformanceformat.com/6ed74dd764a1f6932099250c6d3b1645/invoke.js"
        strategy="afterInteractive"
      />
    </div>
  )
}

export function SidebarAd() {
  return (
    <div
      className="ad-slot ad-sidebar hidden md:flex w-[300px] h-[250px] mx-auto items-center justify-center rounded border border-dashed border-gray-800 bg-gray-900/40 text-xs text-gray-700 select-none"
      aria-hidden="true"
    >
      Advertisement
    </div>
  )
}
