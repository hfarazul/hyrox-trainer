'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

// Dynamically import Spline to avoid SSR issues
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black" />,
});

// SVG Icons
function TimerIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function TargetIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h2v8H4V8zm14 0h2v8h-2V8zM7 10h10v4H7v-4zM2 9h2v6H2V9zm18 0h2v6h-2V9z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const ctaLink = session ? '/app' : '/auth/signin';

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-start pt-24 sm:pt-32 px-4 relative overflow-hidden">
        {/* Spline 3D Background */}
        <div className="absolute inset-0 z-0">
          <Spline scene="https://prod.spline.design/6naopzxuSaBQu3ez/scene.splinecode" />
        </div>

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          {/* Logo */}
          <div className="mb-8">
            <span className="text-5xl sm:text-6xl font-black tracking-tight">
              <span className="text-[#ffed00]">HY</span>
              <span className="text-white">TRAIN</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white mb-4">
            Train for HYROX.
            <br />
            <span className="text-[#ffed00]">Anywhere.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-xl mx-auto">
            Custom workouts based on your equipment. Track every session.
          </p>

          {/* CTA Button */}
          <Link
            href={ctaLink}
            className="inline-block px-8 py-4 bg-[#ffed00] hover:bg-[#e6d600] text-black font-black text-lg uppercase tracking-wide rounded-lg transition-colors"
          >
            Start Training — Free
          </Link>

          {/* Already signed in indicator */}
          {session && (
            <p className="mt-4 text-sm text-gray-500">
              Welcome back, {session.user?.name || session.user?.email}
            </p>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <ChevronDownIcon className="w-8 h-8 text-gray-600" />
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black uppercase text-white mb-6">
            No SkiErg? <span className="text-[#ffed00]">No problem.</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Select what you have. We&apos;ll build workouts with the best alternatives for each station.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-center text-white mb-12">
            Everything you need to <span className="text-[#ffed00]">race ready</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 hover:border-[#ffed00]/50 transition-colors">
              <div className="w-12 h-12 bg-[#ffed00]/10 rounded-lg flex items-center justify-center mb-4">
                <TimerIcon className="w-6 h-6 text-[#ffed00]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Race Simulator</h3>
              <p className="text-gray-400 text-sm">Time every station. Track your pace.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 hover:border-[#ffed00]/50 transition-colors">
              <div className="w-12 h-12 bg-[#ffed00]/10 rounded-lg flex items-center justify-center mb-4">
                <ChartIcon className="w-6 h-6 text-[#ffed00]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Progress Tracking</h3>
              <p className="text-gray-400 text-sm">PRs, trends, and session history.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 hover:border-[#ffed00]/50 transition-colors">
              <div className="w-12 h-12 bg-[#ffed00]/10 rounded-lg flex items-center justify-center mb-4">
                <TargetIcon className="w-6 h-6 text-[#ffed00]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pacing Calculator</h3>
              <p className="text-gray-400 text-sm">Know your target splits before race day.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 hover:border-[#ffed00]/50 transition-colors">
              <div className="w-12 h-12 bg-[#ffed00]/10 rounded-lg flex items-center justify-center mb-4">
                <DumbbellIcon className="w-6 h-6 text-[#ffed00]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Any Equipment</h3>
              <p className="text-gray-400 text-sm">20+ alternatives for each station.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section (Placeholder) */}
      <section className="py-20 px-4 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-xl sm:text-2xl text-gray-300 italic mb-4">
            &ldquo;Finally, a HYROX app that works with my home gym setup.&rdquo;
          </blockquote>
          <p className="text-gray-500">— HYROX Athlete</p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black uppercase text-white mb-4">
            Simulate race day.
            <br />
            <span className="text-[#ffed00]">Crush race day.</span>
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Start training today. No credit card required.
          </p>
          <Link
            href={ctaLink}
            className="inline-block px-8 py-4 bg-[#ffed00] hover:bg-[#e6d600] text-black font-black text-lg uppercase tracking-wide rounded-lg transition-colors"
          >
            Start Training — Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#1f1f1f]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black">
              <span className="text-[#ffed00]">HY</span>
              <span className="text-white">TRAIN</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Train anywhere. Race ready.
          </p>
        </div>
      </footer>
    </div>
  );
}
