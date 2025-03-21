"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoodSelector } from "@/components/mood-selector";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Loader2, Music, ExternalLink, Check, X } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getUserTopTracks,
  getRecommendations,
  createPlaylist,
  addTracksToPlaylist,
  moodToAudioFeatures,
  getAvailableGenres,
  generateMoodPlaylistWithAI,
  getSpotifyHeaders,
  getMarketFromLanguage
} from "@/lib/spotify";

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  externalUrl: string;
  tracks: Track[];
}

// Languages available for selection
const languages = [
  { value: "any", label: "Any Language" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("any");
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPlaylist, setTempPlaylist] = useState<{ id: string, tracks: string[]; } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    // Reset playlist and error when selecting a new mood
    setPlaylist(null);
    setError(null);
    setTempPlaylist(null);
  };

  const generatePlaylist = async () => {
    if (!selectedMood) {
      setError("Please select a mood first");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get audio features for the selected mood
      const audioFeatures = moodToAudioFeatures[selectedMood as keyof typeof moodToAudioFeatures];

      // Get market code from language
      const market = getMarketFromLanguage(selectedLanguage);
      console.log(`Using market code for ${selectedLanguage}: ${market || 'none (global)'}`);

      // Get user's top tracks to use as seeds
      let seedTracks: string[] = [];
      let seedGenres: string[] = [];

      try {
        // Try to get available genres 
        try {
          const genresData = await getAvailableGenres();
          console.log("Available genres:", genresData.genres);
          seedGenres = genresData.genres.slice(0, 2); // Take 2 genres as backup
        } catch (genresError) {
          console.error("Error fetching genres:", genresError);
          seedGenres = ["pop", "rock"]; // Fallback genres
        }

        // Get top tracks
        console.log("Fetching top tracks...");
        const topTracks = await getUserTopTracks("medium_term", 5);
        if (topTracks?.items?.length > 0) {
          seedTracks = topTracks.items.map((track: any) => track.id).slice(0, 3);
          console.log(`Got ${seedTracks.length} seed tracks:`, seedTracks);
        } else {
          console.log("No top tracks found, using genre seeds");
        }
      } catch (topTracksError) {
        console.error("Error fetching top tracks:", topTracksError);
      }

      // Get recommendations based on tracks and mood
      console.log("Getting recommendations...");
      const recommendationParams: any = {
        limit: 25,
        ...audioFeatures
      };

      // Add seed parameters based on what we have
      if (seedTracks.length > 0) {
        console.log("Using seed tracks:", seedTracks);
        recommendationParams.seedTracks = seedTracks;
      }

      if (seedGenres.length > 0 && seedTracks.length === 0) {
        console.log("Using seed genres:", seedGenres);
        recommendationParams.seedGenres = seedGenres;
      }

      // Add language filter if a specific language is selected
      if (selectedLanguage !== "any") {
        console.log(`Filtering for language: ${selectedLanguage} with market: ${market}`);
        if (market) {
          recommendationParams.market = market;
        }
      }

      console.log("Recommendation params:", recommendationParams);
      const recommendations = await getRecommendations(recommendationParams);

      if (!recommendations?.tracks?.length) {
        throw new Error("No tracks were found for your mood. Please try a different mood or language.");
      }

      // Create a temporary playlist for preview
      console.log("Creating temporary playlist...");
      const playlistName = `My ${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Playlist${selectedLanguage !== "any" ? ` (${selectedLanguage})` : ""}`;
      const playlistDescription = `A ${selectedMood} playlist generated with AI based on your listening history${selectedLanguage !== "any" ? ` in ${selectedLanguage}` : ""}`;

      const createdPlaylist = await createPlaylist(playlistName, playlistDescription);

      // Add recommended tracks to the playlist
      console.log("Adding tracks to temporary playlist...");
      const trackUris = recommendations.tracks.map((track: any) => track.uri);
      await addTracksToPlaylist(createdPlaylist.id, trackUris);

      // Store temporary playlist info for later use (save or discard)
      setTempPlaylist({
        id: createdPlaylist.id,
        tracks: trackUris
      });

      console.log("Temporary playlist created successfully!");

      // Set the playlist in state for preview
      setPlaylist({
        id: createdPlaylist.id,
        name: createdPlaylist.name,
        description: createdPlaylist.description,
        externalUrl: createdPlaylist.external_urls.spotify,
        tracks: recommendations.tracks.map((track: any) => ({
          id: track.id,
          name: track.name,
          artist: track.artists.map((artist: any) => artist.name).join(', '),
          album: track.album.name,
          image: track.album.images[0]?.url
        }))
      });
    } catch (err: any) {
      console.error("Error generating playlist:", err);
      setError(err.message || "Something went wrong generating your playlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateAIPlaylist = async () => {
    if (!selectedMood) {
      setError("Please select a mood first");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate playlist using AI with personalized tracks
      const playlistName = `My ${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes${selectedLanguage !== "any" ? ` (${selectedLanguage})` : ""}`;
      const result = await generateMoodPlaylistWithAI(selectedMood, playlistName, 15, selectedLanguage);

      console.log("DEBUG: AI Playlist created:", result);

      // Store temporary playlist info for later
      setTempPlaylist({
        id: result.playlist.id,
        tracks: result.tracks || []
      });

      // Fetch tracks for the playlist
      let playlistTracks: Track[] = [];

      if (result.fallback) {
        // For fallback case, we already have the tracks from getAIMoodRecommendations
        const aiFallbackResponse = await fetch(`https://api.spotify.com/v1/playlists/${result.playlist.id}`, {
          headers: await getSpotifyHeaders()
        });

        if (aiFallbackResponse.ok) {
          const playlistData = await aiFallbackResponse.json();
          playlistTracks = playlistData.tracks.items.map((item: any) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map((artist: any) => artist.name).join(', '),
            album: item.track.album.name,
            image: item.track.album.images[0]?.url
          }));
        }
      } else {
        // For regular case, we need to retrieve tracks
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${result.playlist.id}/tracks`, {
          headers: await getSpotifyHeaders()
        });

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          playlistTracks = tracksData.items.map((item: any) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map((artist: any) => artist.name).join(', '),
            album: item.track.album.name,
            image: item.track.album.images[0]?.url
          }));
        }
      }

      // Set the playlist in state
      setPlaylist({
        id: result.playlist.id,
        name: result.playlist.name,
        description: result.playlist.description || `AI-generated playlist for ${selectedMood} mood based on your listening history`,
        externalUrl: result.playlist.external_urls.spotify,
        tracks: playlistTracks
      });

    } catch (err: any) {
      console.error("Error generating AI playlist:", err);
      setError(err.message || "Something went wrong generating your AI playlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to save the playlist permanently
  const savePlaylist = async () => {
    try {
      // No API action needed as playlist is already saved in Spotify
      // Just reset the temporary playlist state
      setTempPlaylist(null);

      // Show success message
      setError("Playlist saved successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("Error saving playlist:", err);
      // Still clear the tempPlaylist state
      setTempPlaylist(null);
      setError("Error occurred, but playlist saved");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Function to discard the generated playlist
  const discardPlaylist = async () => {
    try {
      if (tempPlaylist?.id) {
        try {
          console.log("Attempting to discard playlist:", tempPlaylist.id);

          // Get headers with fresh session
          const headers = await getSpotifyHeaders();
          console.log("Headers obtained successfully");

          // First try with explicit CORS mode
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            console.log("Making DELETE request to Spotify API...");
            const response = await fetch(`https://api.spotify.com/v1/playlists/${tempPlaylist.id}/followers`, {
              method: 'DELETE',
              headers,
              signal: controller.signal,
              mode: 'cors',
              credentials: 'include'
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              console.log("Playlist discard request successful");
            } else {
              console.warn(`Spotify returned an error: ${response.status} ${response.statusText}`);
              // Continue anyway
            }
          } catch (fetchError) {
            console.error("Error in DELETE request:", fetchError);
            // Continue and clean up UI state
          }
        } catch (apiError: any) {
          // Log the error but continue to clean up the UI
          console.error("Error calling Spotify API:", apiError);
          if (apiError.name === 'AbortError') {
            console.error("Request timed out - connection issue");
          }
          // Continue execution to clean up UI
        }
      }

      // Reset states regardless of API success/failure
      setTempPlaylist(null);
      setPlaylist(null);
      setError("Playlist removed from view");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("Error in discardPlaylist function:", err);
      setError("Error occurred, but playlist removed from view");
      // Still reset the state to improve user experience
      setTempPlaylist(null);
      setPlaylist(null);
      setTimeout(() => setError(null), 3000);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-900 to-black">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-900 to-black p-6">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-white">Choose Your Mood</h1>
            <p className="text-lg text-gray-400">
              Select a mood and let AI create the perfect playlist for you
            </p>
          </div>

          <MoodSelector selectedMood={selectedMood} onSelectMood={handleMoodSelect} />

          {/* Language Selector */}
          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-xs">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Preferred Language
              </label>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className={`w-full ${selectedLanguage !== "any" ? "border-green-400 bg-green-900/20" : ""}`}>
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLanguage !== "any" && (
                <p className="mt-2 text-xs text-green-400">
                  Playlist will favor songs in {languages.find(l => l.value === selectedLanguage)?.label}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className={`mt-6 rounded-md p-4 text-center ${error.includes("successfully") || error.includes("discarded") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col md:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="px-8 bg-green-600 hover:bg-green-700"
              onClick={generatePlaylist}
              disabled={loading || !selectedMood}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                "Basic Playlist"
              )}
            </Button>

            <Button
              size="lg"
              className="px-8 bg-purple-600 hover:bg-purple-700"
              onClick={generateAIPlaylist}
              disabled={loading || !selectedMood}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                "AI Playlist"
              )}
            </Button>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className="lg:w-[400px]">
          <div className="sticky top-6">
            <Card className="bg-card/95 h-[calc(100vh-3rem)] overflow-y-auto">
              {playlist ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Music className="mr-2 h-5 w-5" /> {playlist.name}
                    </CardTitle>
                    <CardDescription>{playlist.description}</CardDescription>
                    <Link
                      href={playlist.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-primary hover:text-primary/80"
                    >
                      Open in Spotify <ExternalLink className="ml-1 h-4 w-4" />
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {playlist.tracks.map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-4 rounded-md p-2 hover:bg-accent/50"
                        >
                          {track.image && (
                            <img
                              src={track.image}
                              alt={track.album}
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          )}
                          <div className="overflow-hidden">
                            <div className="font-medium truncate">{track.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-4 border-t">
                    <Button
                      onClick={savePlaylist}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!tempPlaylist}
                    >
                      <Check className="mr-2 h-4 w-4" /> Save Playlist
                    </Button>
                    <Button
                      onClick={discardPlaylist}
                      variant="outline"
                      className="text-red-500 hover:text-red-600 hover:bg-red-100/10"
                      disabled={!tempPlaylist}
                    >
                      <X className="mr-2 h-4 w-4" /> Discard
                    </Button>
                  </CardFooter>
                </>
              ) : (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <Music className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Playlist Yet</h3>
                    <p className="text-muted-foreground">
                      You have not generated a playlist yet. Select a mood and click one of the generate buttons.
                    </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}