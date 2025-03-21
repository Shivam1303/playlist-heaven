"use client";

import { Button } from "@/components/ui/button";
import { Music4, SparklesIcon } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

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
    <main className="min-h-screen bg-spotify-black text-white">
      {/* Background gradient effect similar to Spotify */}
      <div className="absolute inset-0 bg-gradient-to-b from-spotify-purple/20 to-transparent" />

      <div className="container relative mx-auto px-6 py-20">
        <div className="flex flex-col items-center justify-center space-y-10 text-center">
          {/* Logo area */}
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-spotify-green to-spotify-cyan p-0.5">
            <div className="rounded-full bg-spotify-black p-4">
              <Music4 className="h-16 w-16 text-spotify-green" />
            </div>
          </div>

          {/* Main headings with gradient text */}
          <div className="space-y-6">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-spotify-green via-spotify-cyan to-white">
              AI Spotify Playlist Generator
            </h1>
            <p className="max-w-[700px] text-xl text-gray-300 sm:text-2xl">
              Create personalized playlists based on your mood and listening history using
              the power of AI
            </p>
          </div>

          {/* Feature bullets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl text-left">
            <div className="bg-spotify-darkgray rounded-xl p-6 hover-scale">
              <div className="inline-flex bg-spotify-purple/20 p-2 rounded-lg mb-4">
                <SparklesIcon className="h-6 w-6 text-spotify-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered</h3>
              <p className="text-gray-400">Intelligent playlist generation using advanced AI algorithms</p>
            </div>
            <div className="bg-spotify-darkgray rounded-xl p-6 hover-scale">
              <div className="inline-flex bg-spotify-orange/20 p-2 rounded-lg mb-4">
                <Music4 className="h-6 w-6 text-spotify-orange" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Mood Based</h3>
              <p className="text-gray-400">Select your mood and get the perfect playlist for any occasion</p>
            </div>
            <div className="bg-spotify-darkgray rounded-xl p-6 hover-scale">
              <div className="inline-flex bg-spotify-neon/20 p-2 rounded-lg mb-4">
                <svg className="h-6 w-6 text-spotify-neon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12 13V5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Personalized</h3>
              <p className="text-gray-400">Tailored to your listening history and preferences</p>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="px-8 py-6 text-lg bg-spotify-green hover:bg-spotify-green/90 hover-scale"
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