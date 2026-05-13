/**
 * Ad slot placeholders for Monetag / PropellerAds integration.
 * Both variants are hidden on mobile (<768px) to comply with ad network policies.
 *
 * Verification tag for Monetag:
 * <meta name="monetag" content="f9c9ada02fa54e94b1ecb2673d7d183f">
 */

export function LeaderboardAd() {
  return (
    <div
      className="ad-slot ad-leaderboard hidden md:flex w-full max-w-[728px] h-[90px] mx-auto items-center justify-center rounded border border-dashed border-gray-800 bg-gray-900/40 text-xs text-gray-700 select-none"
      aria-hidden="true"
    >
      Advertisement
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
