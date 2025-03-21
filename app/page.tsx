"use client";

import { Button } from "@/components/ui/button";
import { Music4, SparklesIcon } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSpotifyLogin = () => {
    signIn("spotify", { callbackUrl: "/dashboard" });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-spotify-black to-[#101020] text-white relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-spotify-purple/10 via-transparent to-spotify-green/10 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-radial from-spotify-purple/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-radial from-spotify-green/20 to-transparent pointer-events-none" />

      <div className="container relative mx-auto px-6 py-16 z-10">
        <div className="flex flex-col items-center justify-center space-y-12 text-center">
          {/* Logo area with enhanced styling */}
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-spotify-green to-spotify-cyan p-1 shadow-lg shadow-spotify-green/20">
            <div className="rounded-full bg-spotify-black p-6">
              <Music4 className="h-20 w-20 text-spotify-green" />
            </div>
          </div>

          {/* Animated main heading */}
          <div className="space-y-8">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-spotify-green via-spotify-cyan to-white pb-2 font-audiowide">
              AI Spotify Playlist Generator
            </h1>
            <p className="max-w-[700px] text-xl text-gray-300 sm:text-2xl">
              Create personalized playlists based on your mood and listening history using
              the power of AI
            </p>
          </div>

          {/* Feature bullets with hover effects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl text-left">
            <div className="glass-effect rounded-xl p-6 hover:scale-105 transition-transform duration-300 border border-spotify-green/10 shadow-lg shadow-spotify-green/5">
              <div className="inline-flex bg-spotify-purple/20 p-2 rounded-lg mb-4">
                <SparklesIcon className="h-6 w-6 text-spotify-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">AI-Powered</h3>
              <p className="text-gray-300">Intelligent playlist generation using advanced AI algorithms</p>
            </div>
            <div className="glass-effect rounded-xl p-6 hover:scale-105 transition-transform duration-300 border border-spotify-green/10 shadow-lg shadow-spotify-green/5">
              <div className="inline-flex bg-spotify-orange/20 p-2 rounded-lg mb-4">
                <Music4 className="h-6 w-6 text-spotify-orange" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Mood Based</h3>
              <p className="text-gray-300">Select your mood and get the perfect playlist for any occasion</p>
            </div>
            <div className="glass-effect rounded-xl p-6 hover:scale-105 transition-transform duration-300 border border-spotify-green/10 shadow-lg shadow-spotify-green/5">
              <div className="inline-flex bg-spotify-neon/20 p-2 rounded-lg mb-4">
                <svg className="h-6 w-6 text-spotify-neon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12 13V5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Personalized</h3>
              <p className="text-gray-300">Tailored to your listening history and preferences</p>
            </div>
          </div>

          {/* CTA Button with enhanced styling */}
          <Button
            size="lg"
            className="px-8 py-6 text-lg bg-spotify-green hover:bg-spotify-green/90 hover:scale-105 transition-all duration-300 shadow-lg shadow-spotify-green/30 text-glow"
            onClick={handleSpotifyLogin}
          >
            Connect with Spotify
          </Button>

          {/* Footer note */}
          <p className="text-sm text-gray-500 mt-10">
            Powered by Spotify API & AI • Your music, reimagined
          </p>
        </div>
      </div>
    </main>
  );
}