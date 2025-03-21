"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MoodPlaylistSection } from "./sections/MoodPlaylistSection";
import { CustomPlaylistSection } from "./sections/CustomPlaylistSection";
import { PlaylistSidebar } from "./sections/PlaylistSidebar";
import { Playlist, TempPlaylist, Track } from "./sections/types";
import {
  getUserTopTracks,
  getRecommendations,
  createPlaylist,
  addTracksToPlaylist,
  moodToAudioFeatures,
  getAvailableGenres,
  generateMoodPlaylistWithAI,
  getSpotifyHeaders,
  getMarketFromLanguage,
  generateCustomPromptPlaylist
} from "@/lib/spotify";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("any");
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPlaylist, setTempPlaylist] = useState<TempPlaylist | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customPlaylistName, setCustomPlaylistName] = useState("My Custom Playlist");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setPlaylist(null);
    setError(null);
    setTempPlaylist(null);
  };

  const handleCreatePlaylist = async () => {
    if (!customPrompt.trim()) {
      setError("Please enter a prompt for your custom playlist");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await generateCustomPromptPlaylist(
        customPrompt,
        customPlaylistName,
        15,
        selectedLanguage
      );

      const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${result.playlist.id}/tracks`, {
        headers: await getSpotifyHeaders()
      });

      let playlistTracks: Track[] = [];

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

      setPlaylist({
        id: result.playlist.id,
        name: result.playlist.name,
        description: result.playlist.description || `Custom playlist based on: "${customPrompt}"`,
        externalUrl: result.playlist.external_urls.spotify,
        tracks: playlistTracks
      });

      setTempPlaylist({
        id: result.playlist.id,
        tracks: playlistTracks.map((track: Track) => track.id)
      });
    } catch (error: any) {
      setError(error.message || "Something went wrong creating your custom playlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generatePlaylist = async () => {
    if (!selectedMood) {
      setError("Please select a mood first");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const audioFeatures = moodToAudioFeatures[selectedMood as keyof typeof moodToAudioFeatures];
      const market = getMarketFromLanguage(selectedLanguage);

      let seedTracks: string[] = [];
      let seedGenres: string[] = [];

      try {
        try {
          const genresData = await getAvailableGenres();
          seedGenres = genresData.genres.slice(0, 2);
        } catch {
          seedGenres = ["pop", "rock"];
        }

        const topTracks = await getUserTopTracks("medium_term", 5);
        if (topTracks?.items?.length > 0) {
          seedTracks = topTracks.items.map((track: any) => track.id).slice(0, 3);
        }
      } catch { }

      const recommendationParams: any = {
        limit: 25,
        ...audioFeatures
      };

      if (seedTracks.length > 0) {
        recommendationParams.seedTracks = seedTracks;
      }

      if (seedGenres.length > 0 && seedTracks.length === 0) {
        recommendationParams.seedGenres = seedGenres;
      }

      if (selectedLanguage !== "any" && market) {
        recommendationParams.market = market;
      }

      const recommendations = await getRecommendations(recommendationParams);

      if (!recommendations?.tracks?.length) {
        throw new Error("No tracks were found for your mood. Please try a different mood or language.");
      }

      const playlistName = `My ${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Playlist${selectedLanguage !== "any" ? ` (${selectedLanguage})` : ""}`;
      const playlistDescription = `A ${selectedMood} playlist generated with AI based on your listening history${selectedLanguage !== "any" ? ` in ${selectedLanguage}` : ""}`;

      const createdPlaylist = await createPlaylist(playlistName, playlistDescription);
      const trackUris = recommendations.tracks.map((track: any) => track.uri);
      await addTracksToPlaylist(createdPlaylist.id, trackUris);

      const trackIds = recommendations.tracks.map((track: any) => track.id);
      setTempPlaylist({
        id: createdPlaylist.id,
        tracks: trackIds
      });

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

      const playlistName = `My ${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes${selectedLanguage !== "any" ? ` (${selectedLanguage})` : ""}`;
      const result = await generateMoodPlaylistWithAI(selectedMood, playlistName, 15, selectedLanguage);

      const trackIds = result.tracks.map((track: any) => track.id);
      setTempPlaylist({
        id: result.playlist.id,
        tracks: trackIds
      });

      let playlistTracks: any[] = [];

      if (result.fallback) {
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
      setLoading(true);

      // Check if this is a preview that needs to be created on Spotify
      if (tempPlaylist?.id === "preview" && playlist) {
        console.log("Creating playlist on Spotify from preview");

        // Create a real playlist on Spotify
        const realPlaylist = await createPlaylist(
          playlist.name,
          playlist.description
        );

        // Search for and add the tracks
        const trackUris: string[] = [];

        // For each track in our preview, search Spotify and add the real tracks
        for (const track of playlist.tracks) {
          try {
            const searchQuery = `${track.name} artist:${track.artist.split('ft.')[0].trim()}`;
            const searchResponse = await fetch(
              `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
              { headers: await getSpotifyHeaders() }
            );

            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              if (searchData.tracks.items.length > 0) {
                trackUris.push(searchData.tracks.items[0].uri);
              }
            }
          } catch (error) {
            console.error(`Error searching for track: ${track.name}`, error);
          }
        }

        if (trackUris.length > 0) {
          await addTracksToPlaylist(realPlaylist.id, trackUris);

          // Update the playlist in state with the real one
          setPlaylist({
            ...playlist,
            id: realPlaylist.id,
            externalUrl: realPlaylist.external_urls.spotify
          });

          // Reset temporary playlist state
          setTempPlaylist(null);
        } else {
          throw new Error("Could not find any matching tracks on Spotify");
        }
      } else if (tempPlaylist) {
        // Regular case: playlist already exists on Spotify
        setTempPlaylist(null);
      }

      // Show success message
      setError("Playlist saved successfully to your Spotify account!");
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error("Error saving playlist:", err);
      setError(err.message || "Error occurred while saving playlist. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Function to discard the generated playlist
  const discardPlaylist = async () => {
    try {
      // For preview playlists, we don't need to call Spotify API
      if (tempPlaylist?.id === "preview") {
        console.log("Discarding preview playlist - no API call needed");
      } else if (tempPlaylist?.id) {
      // Only try to remove from Spotify if it's a real playlist
        try {
          console.log("Discarding playlist from Spotify:", tempPlaylist.id);
          const headers = await getSpotifyHeaders();

          const response = await fetch(`https://api.spotify.com/v1/playlists/${tempPlaylist.id}/followers`, {
            method: 'DELETE',
            headers,
            mode: 'cors',
            credentials: 'include'
          });

          if (!response.ok) {
            console.warn(`Spotify returned an error: ${response.status} ${response.statusText}`);
          }
        } catch (apiError: any) {
          console.error("Error calling Spotify API:", apiError);
        }
      }

      // Reset states regardless of API success/failure
      setTempPlaylist(null);
      setPlaylist(null);
      setError("Playlist discarded");
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-900 via-gray-900 to-slate-900">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  // Languages available for selection - needed for custom playlist generation
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
    { value: "zh", label: "Chinese" },
    { value: "ru", label: "Russian" },
    { value: "ar", label: "Arabic" },
    { value: "tr", label: "Turkish" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black p-6">
      <div className="flex flex-col lg:flex-row gap-8 h-full max-w-[1600px] mx-auto">
        <div className="flex-1">
          {/* Mood Playlist Section */}
          <MoodPlaylistSection
            selectedMood={selectedMood}
            selectedLanguage={selectedLanguage}
            loading={loading}
            error={error}
            onSelectMood={handleMoodSelect}
            onSelectLanguage={setSelectedLanguage}
            onGeneratePlaylist={generatePlaylist}
            onGenerateAIPlaylist={generateAIPlaylist}
          />

          {/* Custom Playlist Section */}
          <CustomPlaylistSection
            loading={loading}
            customPrompt={customPrompt}
            customPlaylistName={customPlaylistName}
            onPromptChange={setCustomPrompt}
            onPlaylistNameChange={setCustomPlaylistName}
            onCreateCustomPlaylist={handleCreatePlaylist}
          />
        </div>

        {/* Playlist Sidebar */}
        <PlaylistSidebar
          playlist={playlist}
          tempPlaylist={tempPlaylist}
          loading={loading}
          onSavePlaylist={savePlaylist}
          onDiscardPlaylist={discardPlaylist}
        />
      </div>
    </main>
  );
}