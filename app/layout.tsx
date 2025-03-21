import './globals.css';
import type { Metadata } from 'next';
import { Inter, Audiowide } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/session-provider';
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ['latin'],
  variable: "--font-sans",
});

const audiowide = Audiowide({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-audiowide",
});

export const metadata: Metadata = {
  title: 'AI Spotify Playlist Generator',
  description: 'Generate personalized Spotify playlists using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.variable,
        audiowide.variable,
      )}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}