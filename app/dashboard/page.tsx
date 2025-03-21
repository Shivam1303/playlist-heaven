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
import { Loader2, Music, ExternalLink, Check, X, Sparkles } from "lucide-react";
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
  getSpotifyHeaders
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
        console.log(`Filtering for language: ${selectedLanguage}`);
        recommendationParams.market = selectedLanguage;
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

      // Generate playlist using AI
      const playlistName = `My ${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes`;
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
        description: result.playlist.description || `AI-generated playlist for ${selectedMood} mood`,
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
      <div className="flex min-h-screen items-center justify-center bg-spotify-black">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-spotify-green animate-spin mb-4" />
          <div className="text-xl text-white">Loading your music profile...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-spotify-black text-white pb-10">
      {/* Decorative header gradient */}
      <div className="h-64 bg-gradient-to-b from-spotify-purple/30 to-transparent absolute top-0 left-0 right-0 z-0" />

      <div className="container mx-auto px-4 pt-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            <div className="mb-10">
              <h1 className="mb-2 text-4xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-spotify-green to-spotify-cyan inline-block">
                Choose Your Mood
              </h1>
              <p className="text-lg text-gray-300">
                Select a mood and language, then let AI create the perfect playlist for you
              </p>
              <div className="flex items-center mt-2 bg-spotify-darkgray rounded-lg p-3 text-sm">
                <Sparkles className="text-spotify-orange h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-gray-400">
                  The "AI + Your Taste" option combines your listening history with advanced AI recommendations
                </p>
              </div>
            </div>

            {/* Mood Selector with updated styling */}
            <div className="bg-spotify-darkgray p-6 rounded-xl mb-8">
              <MoodSelector selectedMood={selectedMood} onSelectMood={handleMoodSelect} />
            </div>

            {/* Language Selector */}
            <div className="bg-spotify-darkgray p-6 rounded-xl mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Preferred Language
              </label>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="w-full bg-spotify-lightgray border-none focus:ring-spotify-green text-white">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent className="bg-spotify-lightgray border-spotify-darkgray text-white">
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value} className="focus:bg-spotify-green/20 focus:text-white">
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status/Error Messages */}
            {error && (
              <div className={`mb-6 rounded-lg p-4 text-center ${error.includes("successfully") || error.includes("discarded") ? "bg-spotify-green/20 text-spotify-green" : "bg-red-500/20 text-red-300"}`}>
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Button
                size="lg"
                className="px-8 py-6 bg-spotify-green hover:bg-spotify-green/90 hover-scale"
                onClick={generatePlaylist}
                disabled={loading || !selectedMood}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                  </>
                ) : (
                  "Basic Playlist"
                )}
              </Button>

              <Button
                size="lg"
                className="px-8 py-6 bg-spotify-purple hover:bg-spotify-purple/90 hover-scale"
                onClick={generateAIPlaylist}
                disabled={loading || !selectedMood}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" /> AI + Your Taste
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:w-[450px] relative">
            <div className="sticky top-6">
              <Card className="bg-spotify-darkgray border-none shadow-xl h-[calc(100vh-3rem)] overflow-hidden">
                {playlist ? (
                  <>
                    <CardHeader className="border-b border-spotify-lightgray pb-4">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-br from-spotify-orange to-spotify-green p-3 rounded-md mr-3">
                          <Music className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-white">{playlist.name}</CardTitle>
                          <CardDescription className="text-gray-400">{playlist.description}</CardDescription>
                        </div>
                      </div>
                      <Link
                        href={playlist.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 text-spotify-green hover:text-spotify-green/80 transition-colors"
                      >
                        Open in Spotify <ExternalLink className="ml-1 h-4 w-4" />
                      </Link>
                    </CardHeader>

                    <CardContent className="overflow-y-auto max-h-[60vh] pt-4 scrollbar-thin scrollbar-track-spotify-black scrollbar-thumb-spotify-lightgray">
                      <div className="space-y-2">
                        {playlist.tracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center gap-4 rounded-md p-2 hover:bg-spotify-lightgray transition-colors group"
                          >
                            {track.image && (
                              <img
                                src={track.image}
                                alt={track.album}
                                className="h-12 w-12 rounded-md object-cover group-hover:shadow-lg transition-shadow"
                              />
                            )}
                            <div className="overflow-hidden flex-1">
                              <div className="font-medium truncate text-white">{track.name}</div>
                              <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between pt-4 border-t border-spotify-lightgray bg-spotify-darkgray">
                      <Button
                        onClick={savePlaylist}
                        className="bg-spotify-green hover:bg-spotify-green/90"
                        disabled={!tempPlaylist}
                      >
                        <Check className="mr-2 h-4 w-4" /> Save Playlist
                      </Button>
                      <Button
                        onClick={discardPlaylist}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                        disabled={!tempPlaylist}
                      >
                        <X className="mr-2 h-4 w-4" /> Discard
                      </Button>
                    </CardFooter>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div className="bg-spotify-black/50 p-5 rounded-full mb-6">
                      <Music className="h-14 w-14 text-spotify-green opacity-70" />
                    </div>
                    <h3 className="text-xl font-medium mb-3 text-white">No Playlist Yet</h3>
                    <p className="text-gray-400 max-w-sm">
                      Select a mood and click one of the generate buttons to create your personalized playlist.
                    </p>
                    <div className="mt-8 w-full max-w-xs h-1 bg-spotify-lightgray rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-spotify-purple to-spotify-green" />
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}