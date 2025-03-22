import { getSession, signIn } from "next-auth/react";

export const getSpotifyHeaders = async () => {
    try {
        const session = await getSession();

        if (!session) {
            throw new Error("You must be logged in to access Spotify features");
        }

        if (session.error === "RefreshAccessTokenError") {
            signIn("spotify");
            throw new Error("Session needs refresh. Please try again after logging in.");
        }

        if (!session.accessToken) {
            signIn("spotify");
            throw new Error("Spotify access token missing. Please log in again.");
        }

        return {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json"
        };
    } catch (error) {
        throw error;
    }
};

export const getUserTopTracks = async (timeRange = "medium_term", limit = 50) => {
    const headers = await getSpotifyHeaders();
    const response = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
        { headers }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch top tracks: ${response.statusText}`);
    }

    return response.json();
};

export const getRecentlyPlayed = async (limit = 50) => {
    const headers = await getSpotifyHeaders();
    const response = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
        { headers }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch recently played: ${response.statusText}`);
    }

    return response.json();
};

interface RecommendationParams {
    seedTracks?: string[];
    seedArtists?: string[];
    seedGenres?: string[];
    limit?: number;
    targetEnergy?: number;
    targetDanceability?: number;
    targetValence?: number;
}

export const getAvailableGenres = async () => {
    const headers = await getSpotifyHeaders();
    try {
        return {
            genres: ["pop", "rock", "hip-hop", "electronic", "dance", "r-n-b", "jazz", "classical", "indie", "alternative"]
        };
    } catch (error) {
        return {
            genres: ["pop", "rock", "hip-hop", "electronic", "jazz", "classical"]
        };
    }
};

export const getRecommendations = async ({
    seedTracks = [],
    seedArtists = [],
    seedGenres = [],
    limit = 50,
    targetEnergy,
    targetDanceability,
    targetValence,
    market
}: RecommendationParams & { market?: string; }) => {
    // Directly use the fallback method as the main recommendations API is deprecated
    return await getRecommendationsFallback({
        seedTracks,
        seedArtists,
        seedGenres,
        limit,
        targetEnergy,
        targetDanceability,
        targetValence,
        market
    });
};

// Fallback method using search API as an alternative to recommendations
const getRecommendationsFallback = async ({
    seedTracks = [],
    seedArtists = [],
    seedGenres = [],
    limit = 50,
    targetEnergy,
    targetDanceability,
    targetValence,
    market
}: RecommendationParams & { market?: string; }) => {
    const headers = await getSpotifyHeaders();
    const tracksToFetch = Math.min(limit, 50);
    let combinedTracks: any[] = [];
    const marketParam = market ? `&market=${market}` : '';

    try {
        // If we have seed tracks, use them to find similar tracks via search
        if (seedTracks.length > 0) {
            const seedTrackDetails = await Promise.all(
                seedTracks.slice(0, 3).map(async (trackId) => {
                    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers });
                    if (trackResponse.ok) {
                        const trackData = await trackResponse.json();
                        return {
                            name: trackData.name,
                            artists: trackData.artists.map((a: any) => a.name)
                        };
                    }
                    return null;
                })
            );

            const validTrackDetails = seedTrackDetails.filter(Boolean);

            for (const track of validTrackDetails) {
                if (track) {
                    // Search for similar tracks using track name and artist
                    const searchQuery = `${track.name} ${track.artists[0]}`;
                    const searchResponse = await fetch(
                        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${Math.ceil(tracksToFetch / validTrackDetails.length)}${marketParam}`,
                        { headers }
                    );

                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        // Skip the first result as it's likely the seed track itself
                        combinedTracks = [...combinedTracks, ...searchData.tracks.items.slice(1)];
                    }
                }
            }
        }

        // If we have seed artists, get their top tracks
        if (seedArtists.length > 0 && combinedTracks.length < tracksToFetch) {
            for (const artistId of seedArtists.slice(0, 3)) {
                const topTracksResponse = await fetch(
                    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=from_token`,
                    { headers }
                );

                if (topTracksResponse.ok) {
                    const topTracksData = await topTracksResponse.json();
                    combinedTracks = [...combinedTracks, ...topTracksData.tracks || []];
                }
            }
        }

        // If we have seed genres, search for tracks in those genres
        if (seedGenres.length > 0 && combinedTracks.length < tracksToFetch) {
            for (const genre of seedGenres.slice(0, 3)) {
                const genreSearchResponse = await fetch(
                    `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(genre)}&type=track&limit=${Math.ceil(tracksToFetch / 3)}${marketParam}`,
                    { headers }
                );

                if (genreSearchResponse.ok) {
                    const genreSearchData = await genreSearchResponse.json();
                    combinedTracks = [...combinedTracks, ...genreSearchData.tracks.items];
                }
            }
        }

        // Fallback to top tracks if we couldn't get enough tracks
        if (combinedTracks.length < 5) {
            const topTracksData = await getUserTopTracks("medium_term", tracksToFetch);
            combinedTracks = [...combinedTracks, ...topTracksData.items];
        }

        // Remove duplicates and randomize order for variety
        const uniqueTracks = Array.from(
            new Map(combinedTracks.map((track: any) => [track.id, track])).values()
        ).sort(() => 0.5 - Math.random()).slice(0, limit);

        return {
            tracks: uniqueTracks,
            seeds: []
        };
    } catch (error) {
        console.error("Error in recommendations fallback:", error);
        // Final fallback is user's top tracks
        return getUserTopTracks("medium_term", limit);
    }
};

export const createPlaylist = async (name: string, description = "") => {
    const headers = await getSpotifyHeaders();

    const userResponse = await fetch("https://api.spotify.com/v1/me", { headers });

    if (!userResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    const response = await fetch(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                name,
                description,
                public: true,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to create playlist: ${response.statusText}`);
    }

    return response.json();
};

export const addTracksToPlaylist = async (playlistId: string, trackUris: string[]) => {
    const headers = await getSpotifyHeaders();

    // Validate track URIs to ensure proper Spotify format (spotify:track:id)
    const validTrackUris = trackUris.filter(uri => {
        // Check if URI follows the spotify:track:BASE62ID format
        return typeof uri === 'string' &&
            uri.startsWith('spotify:track:') &&
            uri.length > 14 &&
            /^spotify:track:[a-zA-Z0-9]{22}$/.test(uri);
    });

    if (validTrackUris.length === 0) {
        console.error("No valid track URIs found", { originalUris: trackUris });
        throw new Error("No valid track URIs found to add to playlist");
    }

    if (validTrackUris.length < trackUris.length) {
        console.warn(`Filtered out ${trackUris.length - validTrackUris.length} invalid track URIs`);
    }

    const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                uris: validTrackUris,
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to add tracks to playlist:", errorData);
        throw new Error(`Failed to add tracks to playlist: ${response.statusText}`);
    }

    return response.json();
};

export const moodToAudioFeatures = {
    happy: {
        targetEnergy: 0.8,
        targetDanceability: 0.7,
        targetValence: 0.8,
    },
    energetic: {
        targetEnergy: 0.9,
        targetDanceability: 0.8,
        targetValence: 0.7,
    },
    romantic: {
        targetEnergy: 0.5,
        targetDanceability: 0.5,
        targetValence: 0.5,
    },
    focus: {
        targetEnergy: 0.4,
        targetDanceability: 0.3,
        targetValence: 0.5,
    },
    chill: {
        targetEnergy: 0.3,
        targetDanceability: 0.4,
        targetValence: 0.6,
    },
    party: {
        targetEnergy: 0.9,
        targetDanceability: 0.9,
        targetValence: 0.7,
    },
    workout: {
        targetEnergy: 0.9,
        targetDanceability: 0.7,
        targetValence: 0.6,
    },
    magical: {
        targetEnergy: 0.6,
        targetDanceability: 0.5,
        targetValence: 0.7,
    },
    jazzy: {
        targetEnergy: 0.5,
        targetDanceability: 0.6,
        targetValence: 0.6,
    },
    melancholic: {
        targetEnergy: 0.3,
        targetDanceability: 0.3,
        targetValence: 0.2,
    },
    intense: {
        targetEnergy: 0.8,
        targetDanceability: 0.4,
        targetValence: 0.3,
    },
    dark: {
        targetEnergy: 0.5,
        targetDanceability: 0.3,
        targetValence: 0.2,
    }
};

interface HuggingFaceRequest {
    inputs: string;
    options?: {
        wait_for_model?: boolean;
        use_cache?: boolean;
    };
}

interface EmotionClassification {
    label: string;
    score: number;
}

export const analyzeTextMood = async (text: string): Promise<EmotionClassification[]> => {
    try {
        const API_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base";
        const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: text,
                options: {
                    wait_for_model: true,
                    use_cache: true
                }
            } as HuggingFaceRequest)
        });

        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        return [{ label: "neutral", score: 1.0 }];
    }
};

const emotionToMoodMap = {
    "joy": "happy",
    "surprise": "energetic",
    "neutral": "chill",
    "sadness": "melancholic",
    "fear": "focus",
    "anger": "intense",
    "disgust": "dark"
};

export const languageToMarketMap: Record<string, string> = {
    "any": "",
    "en": "US,GB,CA,AU",  // English
    "es": "ES,MX,AR",     // Spanish
    "fr": "FR,CA",        // French
    "de": "DE,AT,CH",     // German
    "it": "IT",           // Italian
    "pt": "PT,BR",        // Portuguese
    "hi": "IN",           // Hindi
    "ja": "JP",           // Japanese
    "ko": "KR",           // Korean
    "zh": "CN,TW",        // Chinese
    "ru": "RU",           // Russian
    "ar": "SA,EG",        // Arabic
    "tr": "TR"            // Turkish
};

export const getMarketFromLanguage = (language: string): string | undefined => {
    if (!language || language === "any") {
        return undefined;
    }

    const markets = languageToMarketMap[language]?.split(',');
    return markets?.[0];
};

export const getAIMoodRecommendations = async (mood?: string, limit = 50, language?: string) => {
    const headers = await getSpotifyHeaders();

    const market = language ? getMarketFromLanguage(language) : undefined;

    console.log(`Getting AI mood recommendations with mood: ${mood}, language: ${language}, market: ${market}`);

    try {
        const [topTracksResponse, savedTracksResponse, followedArtistsResponse] = await Promise.all([
            fetch(`https://api.spotify.com/v1/me/top/tracks?limit=50`, { headers }),
            fetch(`https://api.spotify.com/v1/me/tracks?limit=50`, { headers }),
            fetch(`https://api.spotify.com/v1/me/following?type=artist&limit=50`, { headers })
        ]);

        if (!topTracksResponse.ok || !savedTracksResponse.ok) {
            throw new Error("Failed to fetch user's tracks");
        }

        const topTracks = await topTracksResponse.json();
        const savedTracks = await savedTracksResponse.json();
        let followedArtists = [];

        if (followedArtistsResponse.ok) {
            const followedArtistsData = await followedArtistsResponse.json();
            followedArtists = followedArtistsData.artists?.items || [];
        }

        const allTracks = [
            ...topTracks.items,
            ...savedTracks.items.map((item: any) => item.track)
        ];

        const uniqueTracks = Array.from(
            new Map(allTracks.map((track: any) => [track.id, track])).values()
        );

        const trackDetails = uniqueTracks.map((track: any) => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name || 'Unknown',
            artistId: track.artists[0]?.id,
            uri: track.uri,
            popularity: track.popularity || 0
        }));

        let targetMood = mood;

        if (!targetMood) {
            const sampleTracks = trackDetails.slice(0, 5);
            const textToAnalyze = sampleTracks.map(t => `${t.name} by ${t.artist}`).join(". ");

            const emotions = await analyzeTextMood(textToAnalyze);

            const topEmotion = emotions.reduce((prev, current) =>
                (current.score > prev.score) ? current : prev
            );

            targetMood = emotionToMoodMap[topEmotion.label as keyof typeof emotionToMoodMap] || "chill";
        }

        console.log(`Using target mood: ${targetMood}`);

        const moodFeatures = moodToAudioFeatures[targetMood as keyof typeof moodToAudioFeatures] || moodToAudioFeatures.chill;

        const artistIds = Array.from(new Set([
            ...trackDetails.map(t => t.artistId).filter(Boolean),
            ...followedArtists.map((artist: any) => artist.id)
        ])).slice(0, 5);

        const topArtistsResponse = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=20`, { headers });
        let genreSeed: string[] = [];

        if (topArtistsResponse.ok) {
            const topArtistsData = await topArtistsResponse.json();
            const artistGenres = topArtistsData.items.flatMap((artist: any) => artist.genres || []);
            genreSeed = Array.from(new Set(artistGenres))
                .filter((genre): genre is string => typeof genre === 'string')
                .slice(0, 5);
        }

        let relatedArtistTracks: any[] = [];

        const randomArtists = artistIds.sort(() => 0.5 - Math.random()).slice(0, 2);

        for (const artistId of randomArtists) {
            try {
                const relatedArtistsResponse = await fetch(
                    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=from_token`,
                    { headers }
                );

                if (relatedArtistsResponse.ok) {
                    const relatedArtistData = await relatedArtistsResponse.json();
                    relatedArtistTracks = [...relatedArtistTracks, ...relatedArtistData.tracks || []];
                }
            } catch (error) {
                console.error(`Error fetching related artists for ${artistId}:`, error);
            }
        }

        const uniqueRelatedTracks = Array.from(
            new Map(relatedArtistTracks.map((track: any) => [track.id, track])).values()
        );

        const seedArtists = artistIds.slice(0, 3);

        const seedTracks = trackDetails
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(t => t.id);

        const searchResults = await getRecommendations({
            seedArtists,
            seedTracks,
            seedGenres: genreSeed,
            limit: Math.floor(limit * 0.7),
            ...moodFeatures,
            ...(market ? { market } : {})
        });

        const combinedTracks = [
            ...(searchResults.tracks || []),
            ...uniqueRelatedTracks
        ];

        const finalTracks = Array.from(
            new Map(combinedTracks.map((track: any) => [track.id, track])).values()
        ).sort(() => 0.5 - Math.random()).slice(0, limit);

        return {
            tracks: finalTracks,
            mood: targetMood,
            analysis: {
                seedArtists,
                seedTracks,
                seedGenres: genreSeed,
                moodFeatures,
                relatedArtistTracksCount: uniqueRelatedTracks.length
            }
        };
    } catch (error) {
        console.error("Error in AI mood recommendations:", error);
        const topTracks = await getUserTopTracks("medium_term", limit);
        return {
            tracks: topTracks.items,
            mood: mood || "neutral",
            analysis: {
                error: "Failed to get AI recommendations, falling back to top tracks"
            }
        };
    }
};

interface HuggingFaceTextGenRequest {
    inputs: string;
    parameters?: {
        max_new_tokens?: number;
        temperature?: number;
        top_p?: number;
        top_k?: number;
        repetition_penalty?: number;
    };
}

export const generateMoodPlaylistWithAI = async (
  mood: string,
  playlistName: string,
  songCount: number = 20,
  language: string = 'any'
) => {
  const headers = await getSpotifyHeaders();

  try {
    console.log(`Getting user's music profile for mood: ${mood} in language: ${language}`);

    const market = getMarketFromLanguage(language);
    console.log(`Using market code for ${language}: ${market || 'none (global)'}`);

    let userTopTracks: any[] = [];
    let userRecentTracks: any[] = [];

    try {
      const topTracksResponse = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10`,
        { headers }
      );

      if (topTracksResponse.ok) {
        const topTracksData = await topTracksResponse.json();
        userTopTracks = topTracksData.items || [];
      }

      const recentTracksResponse = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=10`,
        { headers }
      );

      if (recentTracksResponse.ok) {
        const recentTracksData = await recentTracksResponse.json();
        userRecentTracks = recentTracksData.items?.map((item: any) => item.track) || [];
      }
    } catch (error) {
      console.error("Error fetching user's music profile:", error);
    }

    const API_URL =
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1';
    const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

    if (!API_KEY) {
      console.error('HUGGINGFACE_API_KEY is not defined in environment variables');
      const recommendations = await getAIMoodRecommendations(mood, songCount, language);

      const playlistDescription = `AI-generated playlist for ${mood} mood${
        language !== 'any' ? ` in ${language}` : ''
      } based on your listening history`;
      const playlistData = await createPlaylist(playlistName, playlistDescription);

      const trackUris = recommendations.tracks.map((track: any) => track.uri);
      await addTracksToPlaylist(playlistData.id, trackUris);

      return {
        playlist: playlistData,
        tracks: trackUris.length,
        fallback: true,
        message: 'Used fallback mood recommendations due to missing Hugging Face API key',
      };
    }

    let prompt = `Generate a list of ${songCount} unique and diverse songs that evoke a ${mood} mood. `;
    prompt += `These songs should include a mix of mainstream tracks, emerging artists, and hidden gems, spanning different eras, styles, and regions to offer a fresh and varied collection. `;

    if (language !== 'any') {
      const languageName = language.toUpperCase();
      prompt += `All songs must be in ${languageName}. `;
    }

    if (userTopTracks.length > 0 || userRecentTracks.length > 0) {
      const combinedTracks = [...userTopTracks, ...userRecentTracks]
        .filter((track, index, self) => index === self.findIndex((t) => t.id === track.id))
        .slice(0, 5);
      if (combinedTracks.length > 0) {
        const trackExamples = combinedTracks
          .map((track) => `${track.artists[0]?.name} - ${track.name}`)
          .join(', ');
        prompt += `The user enjoys songs like: ${trackExamples}. Use this as a reference but introduce new artists and varied options that capture the ${mood} mood. `;
      }
    }

    prompt += `Avoid focusing solely on popular songs or repeating artists. `;
    prompt += `Format your answer strictly as a numbered list with each entry in the format: "Artist Name - Song Title". `;
    prompt += `Only include real, existing songs. Here is your list:\n1.`;

    const huggingFaceResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: songCount * 50,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.2,
          do_sample: true,
          top_k: 50,
        },
      } as HuggingFaceTextGenRequest),
    });

    if (!huggingFaceResponse.ok) {
      throw new Error(`Hugging Face API error: ${huggingFaceResponse.statusText}`);
    }

    const result = await huggingFaceResponse.json();
    const generatedText = result[0]?.generated_text || '';

    const songSuggestions: { artist: string; title: string }[] = [];
    const songRegex = /^\d+\.\s+([^–—-]+)\s*[-–—]\s*([^–—-]+)$/gim;
    let match;

    while ((match = songRegex.exec(generatedText)) !== null && songSuggestions.length < songCount) {
      if (match[1] && match[2]) {
        songSuggestions.push({
          artist: match[1].trim(),
          title: match[2].trim(),
        });
      }
    }

    if (songSuggestions.length < songCount) {
      const lines = generatedText.split('\n');
      for (const line of lines) {
        if (line.match(/^\d+\./)) {
          const parts = line.split(/[-–—]/);
          if (parts.length >= 2) {
            const artist = parts[0].replace(/^\d+\.\s*/, '').trim();
            const title = parts.slice(1).join('').trim();
            if (
              artist &&
              title &&
              !songSuggestions.some((s) => s.artist === artist && s.title === title)
            ) {
              songSuggestions.push({ artist, title });
            }
          }
        }
      }
    }

    console.log(`AI suggested ${songSuggestions.length} songs`);

    const trackUris: string[] = [];

    const marketParam = market ? `&market=${market}` : '';

    for (const song of songSuggestions) {
      try {
        const exactSearchQuery = `track:"${song.title}" artist:"${song.artist}"`;
        let searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            exactSearchQuery
          )}&type=track&limit=5${marketParam}`,
          { headers }
        );

        let foundExactMatch = false;
        let foundTrack = null;

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.tracks.items.length > 0) {
            foundTrack = searchData.tracks.items.find((track: any) =>
              track.artists.some(
                (artist: any) =>
                  artist.name.toLowerCase() === song.artist.toLowerCase() ||
                  artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                  song.artist.toLowerCase().includes(artist.name.toLowerCase())
              )
            );

            if (foundTrack) {
              foundExactMatch = true;
              console.log(`Found exact match: ${foundTrack.artists[0].name} - ${foundTrack.name}`);
            }
          }
        }

        if (!foundExactMatch) {
          const generalSearchQuery = `${song.title} ${song.artist}`;
          searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(
              generalSearchQuery
            )}&type=track&limit=10${marketParam}`,
            { headers }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.tracks.items.length > 0) {
              const sortedResults = searchData.tracks.items.sort((a: any, b: any) => {
                const aTitle = a.name.toLowerCase();
                const bTitle = b.name.toLowerCase();
                const targetTitle = song.title.toLowerCase();

                const aArtistMatch = a.artists.some(
                  (artist: any) =>
                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                );

                const bArtistMatch = b.artists.some(
                  (artist: any) =>
                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                );

                if (aArtistMatch && !bArtistMatch) return -1;
                if (!aArtistMatch && bArtistMatch) return 1;

                const aTitleSimilarity =
                  aTitle === targetTitle
                    ? 2
                    : aTitle.includes(targetTitle) || targetTitle.includes(aTitle)
                    ? 1
                    : 0;
                const bTitleSimilarity =
                  bTitle === targetTitle
                    ? 2
                    : bTitle.includes(targetTitle) || targetTitle.includes(bTitle)
                    ? 1
                    : 0;

                return bTitleSimilarity - aTitleSimilarity;
              });

              foundTrack = sortedResults[0];
              console.log(
                `Found best match: ${foundTrack.artists[0].name} - ${foundTrack.name} (original request: ${song.artist} - ${song.title})`
              );
            }
          }
        }

        if (foundTrack) {
          trackUris.push(foundTrack.uri);
        }
      } catch (error) {
        console.error(`Error searching for track: ${song.artist} - ${song.title}`, error);
      }
    }

    if (trackUris.length > 0) {
      try {
        const aiFoundTracks = trackUris.slice(0, 5);

        console.log('Using search fallback for related tracks');
        const searchTrack = await fetch(`https://api.spotify.com/v1/tracks/${aiFoundTracks[0]}`, {
          headers,
        });

        if (searchTrack.ok) {
          const trackData = await searchTrack.json();
          const searchQuery = `${trackData.name} ${trackData.artists[0].name}`;

          const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(
              searchQuery
            )}&type=track&limit=${Math.max(10, songCount - trackUris.length)}${marketParam}`,
            { headers }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const relatedTrackUris = searchData.tracks.items
              .filter((track: any) => !aiFoundTracks.includes(track.id))
              .map((track: any) => track.uri);

            for (const uri of relatedTrackUris) {
              if (!trackUris.includes(uri)) {
                trackUris.push(uri);
              }
            }

            console.log(`Added ${relatedTrackUris.length} related tracks from search`);
          }
        }
      } catch (error) {
        console.error('Error getting related tracks:', error);
      }
    }

    if (trackUris.length < 5) {
      console.log('Not enough AI-suggested songs found. Searching for mood directly.');
      const moodSearchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(mood)}&type=track&limit=${
          songCount - trackUris.length
        }${marketParam}`,
        { headers }
      );

      if (moodSearchResponse.ok) {
        const moodSearchData = await moodSearchResponse.json();
        const moodTrackUris = moodSearchData.tracks.items.map((track: any) => track.uri);

        for (const uri of moodTrackUris) {
          if (!trackUris.includes(uri)) {
            trackUris.push(uri);
          }
        }
      }
    }

    if (trackUris.length === 0) {
      throw new Error('Could not find any tracks for the requested mood');
    }

    const userResponse = await fetch('https://api.spotify.com/v1/me', { headers });
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    const playlistDescription = `AI-generated playlist for ${mood} mood${
      language !== 'any' ? ` in ${language}` : ''
    } based on your music preferences`;
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name:
            playlistName ||
            `${mood} Mood - AI Generated${language !== 'any' ? ` (${language})` : ''}`,
          description: playlistDescription,
          public: true,
        }),
      }
    );

    if (!playlistResponse.ok) {
      throw new Error(`Failed to create playlist: ${playlistResponse.statusText}`);
    }

    const playlistData = await playlistResponse.json();

    await addTracksToPlaylist(playlistData.id, trackUris);

    return {
      playlist: playlistData,
      tracks: trackUris.length,
      suggestedSongs: songSuggestions,
    };
  } catch (error) {
    console.error('Error in generateMoodPlaylistWithAI:', error);
    throw error;
  }
};

export const generateCustomPromptPlaylist = async (
  userPrompt: string,
  playlistName: string,
  songCount: number = 20,
  language: string = 'any'
) => {
  const headers = await getSpotifyHeaders();

  try {
    const market = getMarketFromLanguage(language);
    console.log(`Using market code for ${language}: ${market || 'none (global)'}`);

    const API_URL =
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1';
    const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

    if (!API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not defined in environment variables');
    }

    const systemPrompt = `You are a world-class music expert with deep knowledge spanning a multitude of genres, eras, and cultural influences. Carefully analyze the following user request in complete detail to deliver a personalized song recommendation list that exceeds the user's expectations.
                            Consider the following guidelines:
                            1. User Intent Analysis:
                                - If the user explicitly states a specific artist and instructs to include only that artist's songs, provide tracks exclusively from that artist.
                                - If the user mentions liking an artist's style (e.g., "I like Coldplay songs, give me similar"), suggest songs from similar artists that capture the same mood, style, and atmosphere.
                            2. Comprehensive Song Criteria:
                                - Genre and subgenre nuances, as well as relevant musical influences.
                                - Mood, atmosphere, and tempo of the songs.
                                - Specific song characteristics including instrumentation, lyrical themes, and stylistic elements.
                                - Language preferences and cultural context.
                                - Any numerical details provided (e.g., "top 10", "top 20").
                            3. Curate a Unique Experience:
                                - Blend familiar favorites with innovative, lesser-known tracks to create a diverse and engaging playlist.
                                - Adapt your choices to both align with the user's explicit preferences and introduce novel musical discoveries.
                            4. Response Formatting:
                                - Format the final answer strictly as a numbered list.
                                - Each entry should follow the format “Artist Name - Song Title” and must include only real, existing songs.

                            Leverage your deep analysis of the user request to curate a list that not only matches but enhances the user's musical preferences. Here is your list:\n1.`;

    const fullPrompt = `${systemPrompt}\nUser Request: ${userPrompt}`;

    const huggingFaceResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: songCount * 50,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.2,
          do_sample: true,
          top_k: 50,
        },
      } as HuggingFaceTextGenRequest),
    });

    if (!huggingFaceResponse.ok) {
      throw new Error(`Hugging Face API error: ${huggingFaceResponse.statusText}`);
    }

    const result = await huggingFaceResponse.json();
    const generatedText = result[0]?.generated_text || '';

    const songSuggestions: { artist: string; title: string }[] = [];
    const songRegex = /^\d+\.\s+([^–—-]+)\s*[-–—]\s*([^–—-]+)$/gim;
    let match;

    while ((match = songRegex.exec(generatedText)) !== null && songSuggestions.length < songCount) {
      if (match[1] && match[2]) {
        songSuggestions.push({
          artist: match[1].trim(),
          title: match[2].trim(),
        });
      }
    }

    console.log(`AI suggested ${songSuggestions.length} songs based on user prompt`);

    const trackUris: string[] = [];
    const marketParam = market ? `&market=${market}` : '';

    for (const song of songSuggestions) {
      try {
        const exactSearchQuery = `track:"${song.title}" artist:"${song.artist}"`;
        let searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            exactSearchQuery
          )}&type=track&limit=5${marketParam}`,
          { headers }
        );

        let foundExactMatch = false;
        let foundTrack = null;

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.tracks.items.length > 0) {
            foundTrack = searchData.tracks.items.find((track: any) =>
              track.artists.some(
                (artist: any) =>
                  artist.name.toLowerCase() === song.artist.toLowerCase() ||
                  artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                  song.artist.toLowerCase().includes(artist.name.toLowerCase())
              )
            );

            if (foundTrack) {
              foundExactMatch = true;
              console.log(`Found exact match: ${foundTrack.artists[0].name} - ${foundTrack.name}`);
            }
          }
        }

        if (!foundExactMatch) {
          const generalSearchQuery = `${song.title} ${song.artist}`;
          searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(
              generalSearchQuery
            )}&type=track&limit=10${marketParam}`,
            { headers }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.tracks.items.length > 0) {
              const sortedResults = searchData.tracks.items.sort((a: any, b: any) => {
                const aTitle = a.name.toLowerCase();
                const bTitle = b.name.toLowerCase();
                const targetTitle = song.title.toLowerCase();

                const aArtistMatch = a.artists.some(
                  (artist: any) =>
                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                );

                const bArtistMatch = b.artists.some(
                  (artist: any) =>
                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                );

                if (aArtistMatch && !bArtistMatch) return -1;
                if (!aArtistMatch && bArtistMatch) return 1;

                const aTitleSimilarity =
                  aTitle === targetTitle
                    ? 2
                    : aTitle.includes(targetTitle) || targetTitle.includes(aTitle)
                    ? 1
                    : 0;
                const bTitleSimilarity =
                  bTitle === targetTitle
                    ? 2
                    : bTitle.includes(targetTitle) || targetTitle.includes(bTitle)
                    ? 1
                    : 0;

                return bTitleSimilarity - aTitleSimilarity;
              });

              foundTrack = sortedResults[0];
              console.log(
                `Found best match: ${foundTrack.artists[0].name} - ${foundTrack.name} (original request: ${song.artist} - ${song.title})`
              );
            }
          }
        }

        if (foundTrack) {
          trackUris.push(foundTrack.uri);
        }
      } catch (error) {
        console.error(`Error searching for track: ${song.artist} - ${song.title}`, error);
      }
    }

    const userResponse = await fetch('https://api.spotify.com/v1/me', { headers });
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    const playlistDescription = `AI-generated playlist based on your custom request: "${userPrompt}"`;
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userData.id}/playlists`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: playlistName || 'Custom AI Playlist',
          description: playlistDescription,
          public: true,
        }),
      }
    );

    if (!playlistResponse.ok) {
      throw new Error(`Failed to create playlist: ${playlistResponse.statusText}`);
    }

    const playlistData = await playlistResponse.json();

    await addTracksToPlaylist(playlistData.id, trackUris);

    return {
      playlist: playlistData,
      tracks: trackUris.length,
      suggestedSongs: songSuggestions,
    };
  } catch (error) {
    console.error('Error in generateCustomPromptPlaylist:', error);
    throw error;
  }
};