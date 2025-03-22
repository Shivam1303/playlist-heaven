"use client";

import { Button } from "@/components/ui/button";
import { Music4, SparklesIcon, Waves, Headphones, Share2, Disc3Icon, Volume2, VolumeX } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    // Try to play audio when the component mounts
    if (audioRef.current) {
      // Try to play audio automatically
      audioRef.current.play().catch(error => {
        console.error("Autoplay was prevented by browser:", error);
        // If autoplay is prevented, set to muted
        setIsMuted(true);
      });
    }
  }, []);

  useEffect(() => {
    // Handle audio mute/unmute when the state changes
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted) {
        audioRef.current.play().catch(error => {
          console.error("Playback was prevented:", error);
          setIsMuted(true);
        });
      }
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSpotifyLogin = () => {
    signIn("spotify", { callbackUrl: "/dashboard" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const featureCardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    },
    hover: {
      y: -10,
      boxShadow: "0 10px 25px -5px rgba(29, 185, 84, 0.1)",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      borderColor: "rgba(255, 255, 255, 0.1)"
    }
  };

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Audio element */}
      <audio
        ref={audioRef}
        loop
        muted={isMuted}
        preload="auto"
        className="hidden"
        src="/505.mp3"  // Replace with your Arctic Monkeys - 505 file
      />

      {/* Audio controls */}
      <motion.div
        className="fixed bottom-5 right-5 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <span className="text-xs text-white/80 hidden sm:inline">Arctic Monkeys - 505</span>
          <button
            onClick={toggleMute}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-spotify-green hover:bg-spotify-green/90 transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isMuted ? "muted" : "unmuted"}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-black" />
                ) : (
                  <Volume2 className="w-5 h-5 text-black" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* Dynamic background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#111111] to-black opacity-80 z-0"></div>
      <div
        className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay z-0"
        style={{ backgroundSize: '200px 200px' }}
      ></div>

      {/* Cursor spotlight effect with framer-motion */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-10"
        style={{
          background: `radial-gradient(circle, rgba(30, 215, 96, 0.15) 0%, rgba(0,0,0,0) 70%)`,
        }}
        animate={{
          x: mousePosition.x - 250,
          y: mousePosition.y - 250
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 200
        }}
      />

      {/* Floating vinyl records */}
      <motion.div
        className="absolute top-[10%] right-[10%] opacity-20 z-0"
        animate={{
          y: [0, -30, 0],
          rotate: [0, -8, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Disc3Icon className="w-40 h-40 text-spotify-green" />
      </motion.div>

      <motion.div
        className="absolute bottom-[15%] left-[8%] opacity-20 z-0"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Disc3Icon className="w-28 h-28 text-spotify-purple" />
      </motion.div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto">
        <div className="container mx-auto px-4 relative z-20">
          {/* Header with logo */}
          <motion.header
            className="py-8 flex justify-between items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center space-x-2">
              <motion.div
                className="rounded-full bg-spotify-green p-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Music4 className="h-6 w-6 text-black" />
              </motion.div>
              <span className="font-bold text-xl tracking-tighter">PlaylistHeaven</span>
            </div>
          </motion.header>
          {/* Hero Section */}
          <motion.section
            className="flex flex-col md:flex-row items-center justify-between py-16 md:py-28"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="w-full md:w-1/2 space-y-8 md:pr-8">
              <div className="space-y-4">
                <motion.div
                  className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur-sm border border-white/10"
                  variants={itemVariants}
                >
                  <SparklesIcon className="h-4 w-4 mr-2 text-spotify-green" />
                  <span>AI-Powered Playlist Generation</span>
                </motion.div>
                <motion.h1
                  className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-spotify-green to-spotify-cyan"
                  variants={itemVariants}
                >
                  Your Perfect <br />
                  <span className="relative inline-block">
                    <span>Playlist Awaits</span>
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-spotify-green via-spotify-cyan to-spotify-green bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      Playlist Awaits
                    </motion.span>
                  </span>
                </motion.h1>
                <motion.p
                  className="text-lg md:text-xl text-gray-300 max-w-lg"
                  variants={itemVariants}
                >
                  Discover the next generation of playlist creation combining your Spotify history with AI to deliver personalized music experiences.
                </motion.p>
              </div>
              {/* CTA Button */}
              <motion.div
                className="pt-4"
                variants={itemVariants}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleSpotifyLogin}
                    className="relative group overflow-hidden rounded-full bg-spotify-green hover:bg-spotify-green/90 text-black font-medium px-8 py-6 text-lg"
                  >
                    <span className="relative z-10 flex items-center">
                      <Headphones className="mr-2 h-5 w-5" />
                      Connect with Spotify
                      <motion.div
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        →
                      </motion.div>
                    </span>
                    <motion.span
                      className="absolute inset-0 bg-white/10"
                      initial={{ y: "100%" }}
                      whileHover={{ y: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </Button>
                </motion.div>
              </motion.div>
              {/* Stats */}
              <motion.div
                className="flex space-x-6 pt-8"
                variants={itemVariants}
              >
                <div>
                  <motion.div
                    className="text-3xl font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                  >
                    1000+
                  </motion.div>
                  <div className="text-gray-400 text-sm">Playlists Generated</div>
                </div>
                <div className="h-12 w-px bg-gray-800"></div>
                <div>
                  <motion.div
                    className="text-3xl font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.7 }}
                  >
                    24/7
                  </motion.div>
                  <div className="text-gray-400 text-sm">AI Assistance</div>
                </div>
                <div className="h-12 w-px bg-gray-800"></div>
                <div>
                  <motion.div
                    className="text-3xl font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.9 }}
                  >
                    100%
                  </motion.div>
                  <div className="text-gray-400 text-sm">Free to Use</div>
                </div>
              </motion.div>
            </div>
            {/* Hero Visualization */}
            <motion.div
              className="w-full md:w-1/2 mt-12 md:mt-0 flex justify-center"
              variants={itemVariants}
            >
              <motion.div
                className="relative w-[400px] h-[400px] rounded-full bg-gradient-to-br from-spotify-green/20 to-spotify-purple/20 flex items-center justify-center backdrop-blur-sm border border-white/5"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute inset-8 rounded-full bg-black/80 flex items-center justify-center">
                  <div className="flex items-end h-16 gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-6 bg-spotify-green rounded-sm"
                        animate={{ height: [20, 50, 20] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/10"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </motion.section>
          {/* Features Section */}
          <section className="py-16 md:py-24">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Craft Your Perfect Soundtrack</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Our AI-powered tool understands your musical tastes and helps you create the perfect playlists for any moment.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 transition-all"
                variants={featureCardVariants}
                initial="hidden"
                whileInView="visible"
                whileHover="hover"
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-spotify-green/20 to-spotify-green/5 mb-4">
                  <SparklesIcon className="h-6 w-6 text-spotify-green" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
                <p className="text-gray-400">Our advanced AI analyzes your listening patterns to generate playlists that match your unique taste.</p>
              </motion.div>
              <motion.div
                className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 transition-all"
                variants={featureCardVariants}
                initial="hidden"
                whileInView="visible"
                whileHover="hover"
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.1 }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-spotify-green/20 to-spotify-green/5 mb-4">
                  <Waves className="h-6 w-6 text-spotify-green" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Mood Based</h3>
                <p className="text-gray-400">Set the mood for any occasion with playlists tailored to your emotional state or activity.</p>
              </motion.div>
              <motion.div
                className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 transition-all"
                variants={featureCardVariants}
                initial="hidden"
                whileInView="visible"
                whileHover="hover"
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-spotify-green/20 to-spotify-green/5 mb-4">
                  <Share2 className="h-6 w-6 text-spotify-green" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Easy Sharing</h3>
                <p className="text-gray-400">Share your personalized playlists directly to Spotify and with friends in just a few clicks.</p>
              </motion.div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <motion.footer
          className="border-t border-white/10 py-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <motion.div
                className="rounded-full bg-spotify-green p-1"
                whileHover={{ scale: 1.2, rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Music4 className="h-4 w-4 text-black" />
              </motion.div>
              <span className="font-medium">PlaylistHeaven</span>
            </div>
            <div className="text-sm text-gray-500">
              Powered by Spotify API & AI • Your music, reimagined
            </div>
          </div>
        </motion.footer>
      </div>
    </main>
  );
}