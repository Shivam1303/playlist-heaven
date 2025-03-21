import { getSession, signIn } from "next-auth/react";

// Basic headers for Spotify API requests
export const getSpotifyHeaders = async () => {
    try {
        const session = await getSession();

        if (!session) {
            console.error("No session found");
            throw new Error("You must be logged in to access Spotify features");
        }

        // Check for session error (might be set by our token refresh mechanism)
        if (session.error === "RefreshAccessTokenError") {
            console.error("Session has refresh token error, redirecting to sign in");
            signIn("spotify");
            throw new Error("Session needs refresh. Please try again after logging in.");
        }

        if (!session.accessToken) {
            console.error("No access token in session");
            // Attempt to refresh the session
            signIn("spotify");
            throw new Error("Spotify access token missing. Please log in again.");
        }

        console.log("Using access token:", session.accessToken.substring(0, 10) + "...");

        return {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json"
        };
    } catch (error) {
        console.error("Error getting Spotify headers:", error);
        throw error;
    }
};

// Get user's top tracks
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

// Get user's recently played tracks
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

// Get available genre seeds from Spotify
export const getAvailableGenres = async () => {
    const headers = await getSpotifyHeaders();
    try {
        console.log('headers', headers);
        // Return hardcoded genres since the available-genre-seeds endpoint may be deprecated too
        return {
            genres: ["pop", "rock", "hip-hop", "electronic", "dance", "r-n-b", "jazz", "classical", "indie", "alternative"]
        };
    } catch (error) {
        console.error("Error fetching available genres:", error);
        // Return a safe fallback of common genres
        return {
            genres: ["pop", "rock", "hip-hop", "electronic", "jazz", "classical"]
        };
    }
};

// Get recommendations based on search as an alternative to the deprecated recommendations endpoint
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
    const headers = await getSpotifyHeaders();

    console.log(`Getting recommendations with market: ${market || 'none (global)'}`);

    try {
        // Use available seeds to create search queries
        let searchQueries = [];

        // Use seed tracks if available (get track and artist names)
        if (seedTracks.length > 0) {
            // Try to get track details for the first seed track
            const trackResponse = await fetch(
                `https://api.spotify.com/v1/tracks/${seedTracks[0]}`,
                { headers }
            );

            if (trackResponse.ok) {
                const trackData = await trackResponse.json();
                const trackName = trackData.name;
                const artistName = trackData.artists[0]?.name;

                if (trackName && artistName) {
                    searchQueries.push(`${artistName} ${trackName}`);
                }
            }
        }

        // Use seed artists if available
        if (seedArtists.length > 0 && searchQueries.length < 3) {
            // Get artist details
            const artistResponse = await fetch(
                `https://api.spotify.com/v1/artists/${seedArtists[0]}`,
                { headers }
            );

            if (artistResponse.ok) {
                const artistData = await artistResponse.json();
                searchQueries.push(artistData.name);
            }
        }

        // Use seed genres if available
        if (seedGenres.length > 0 && searchQueries.length < 3) {
            searchQueries.push(seedGenres[0]);
        }

        // If no specific seeds could be processed, use some default genres
        if (searchQueries.length === 0) {
            searchQueries.push("pop", "rock");
        }

        // Perform searches and collect results
        let allTracks: any[] = [];

        // Add market parameter to search if available
        const marketParam = market ? `&market=${market}` : "";

        for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
            const searchResponse = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${Math.ceil(limit / searchQueries.length)}${marketParam}`,
                { headers }
            );

            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                allTracks = [...allTracks, ...searchData.tracks.items];
            }
        }

        // Remove duplicates based on track ID
        const uniqueTracks = Array.from(
            new Map(allTracks.map(track => [track.id, track])).values()
        );

        // Format to match the structure of the original recommendations response
        return {
            tracks: uniqueTracks.slice(0, limit),
            seeds: searchQueries.map(query => ({ initialPoolSize: allTracks.length, afterFilteringSize: uniqueTracks.length, query }))
        };
    } catch (error) {
        console.error("Error in search-based recommendations:", error);

        // Fallback to user's top tracks
        console.log("Fetching top tracks as fallback");
        return getUserTopTracks("medium_term", limit);
    }
};

// Create a playlist
export const createPlaylist = async (name: string, description = "") => {
    const headers = await getSpotifyHeaders();

    // First get the user's ID
    const userResponse = await fetch("https://api.spotify.com/v1/me", { headers });

    if (!userResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    // Create the playlist
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

// Add tracks to a playlist
export const addTracksToPlaylist = async (playlistId: string, trackUris: string[]) => {
    const headers = await getSpotifyHeaders();

    const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                uris: trackUris,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to add tracks to playlist: ${response.statusText}`);
    }

    return response.json();
};

// Map moods to Spotify audio features
export const moodToAudioFeatures = {
    happy: {
        targetEnergy: 0.8,
        targetDanceability: 0.7,
        targetValence: 0.8, // Valence represents positiveness
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
    // New mood mappings for emotions
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

// Interface for Hugging Face API requests
interface HuggingFaceRequest {
    inputs: string;
    options?: {
        wait_for_model?: boolean;
        use_cache?: boolean;
    };
}

// Interface for Hugging Face API responses for emotion classification
interface EmotionClassification {
    label: string;
    score: number;
}

// Get mood analysis from text using Hugging Face API
export const analyzeTextMood = async (text: string): Promise<EmotionClassification[]> => {
    try {
        const API_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base";
        // Provide a hardcoded fallback if environment variable is missing
        const API_KEY = process.env.HUGGINGFACE_API_KEY;

        console.log("Using Hugging Face API key:", API_KEY ? API_KEY.substring(0, 5) + "..." : "none");

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
        console.error("Error analyzing text mood:", error);
        // Return default neutral emotion if analysis fails
        return [{ label: "neutral", score: 1.0 }];
    }
};

// Map emotional labels to Spotify mood features
const emotionToMoodMap = {
    "joy": "happy",
    "surprise": "energetic",
    "neutral": "chill",
    "sadness": "melancholic",
    "fear": "focus",
    "anger": "intense",
    "disgust": "dark"
};

// Map language selection to Spotify market codes
export const languageToMarketMap: Record<string, string> = {
    "any": "", // No specific market
    "en": "US,GB,CA,AU", // English
    "es": "ES,MX,AR,CO", // Spanish
    "fr": "FR,CA", // French
    "de": "DE,AT,CH", // German
    "it": "IT", // Italian
    "pt": "PT,BR", // Portuguese
    "hi": "IN", // Hindi
    "ja": "JP", // Japanese
    "ko": "KR"  // Korean
};

// Helper function to get the appropriate market code from language selection
export const getMarketFromLanguage = (language: string): string | undefined => {
    if (!language || language === "any") {
        return undefined;
    }

    // Return the first market code for the language (most representative)
    const markets = languageToMarketMap[language]?.split(',');
    return markets?.[0];
};

// Get AI-recommended tracks based on user's library and specified mood
export const getAIMoodRecommendations = async (mood?: string, limit = 50, language?: string) => {
    const headers = await getSpotifyHeaders();

    // Set market parameter based on language using our mapping
    const market = language ? getMarketFromLanguage(language) : undefined;

    console.log(`Getting AI mood recommendations with mood: ${mood}, language: ${language}, market: ${market}`);

    try {
        // Step 1: Collect user's top tracks, saved tracks, and followed artists
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

        // Step 2: Combine and deduplicate tracks
        const allTracks = [
            ...topTracks.items,
            ...savedTracks.items.map((item: any) => item.track)
        ];

        // Remove duplicates by track ID
        const uniqueTracks = Array.from(
            new Map(allTracks.map((track: any) => [track.id, track])).values()
        );

        // Step 3: Extract track details for analysis
        const trackDetails = uniqueTracks.map((track: any) => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name || 'Unknown',
            artistId: track.artists[0]?.id,
            uri: track.uri,
            popularity: track.popularity || 0
        }));

        // Step 4: If mood is specified, use it directly, otherwise analyze track names
        let targetMood = mood;

        if (!targetMood) {
            // Sample some track names for mood analysis
            const sampleTracks = trackDetails.slice(0, 5);
            const textToAnalyze = sampleTracks.map(t => `${t.name} by ${t.artist}`).join(". ");

            const emotions = await analyzeTextMood(textToAnalyze);

            // Get highest scoring emotion
            const topEmotion = emotions.reduce((prev, current) =>
                (current.score > prev.score) ? current : prev
            );

            // Map emotion to mood
            targetMood = emotionToMoodMap[topEmotion.label as keyof typeof emotionToMoodMap] || "chill";
        }

        console.log(`Using target mood: ${targetMood}`);

        // Step 5: Get mood audio features
        const moodFeatures = moodToAudioFeatures[targetMood as keyof typeof moodToAudioFeatures] || moodToAudioFeatures.chill;

        // Step 6: Extract artist and genre information
        // Get artist IDs from tracks
        const artistIds = Array.from(new Set([
            ...trackDetails.map(t => t.artistId).filter(Boolean),
            ...followedArtists.map((artist: any) => artist.id)
        ])).slice(0, 5);

        // Step a: Get genres from user's top artists
        const topArtistsResponse = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=20`, { headers });
        let genreSeed: string[] = [];

        if (topArtistsResponse.ok) {
            const topArtistsData = await topArtistsResponse.json();
            const artistGenres = topArtistsData.items.flatMap((artist: any) => artist.genres || []);
            // Ensure we only add string values to genreSeed
            genreSeed = Array.from(new Set(artistGenres))
                .filter((genre): genre is string => typeof genre === 'string')
                .slice(0, 5);
        }

        // Step b: Get tracks from related artists
        let relatedArtistTracks: any[] = [];

        // Get two random artists to find related artists
        const randomArtists = artistIds.sort(() => 0.5 - Math.random()).slice(0, 2);

        for (const artistId of randomArtists) {
            try {
                // Get related artists
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

        // Deduplicate related artist tracks
        const uniqueRelatedTracks = Array.from(
            new Map(relatedArtistTracks.map((track: any) => [track.id, track])).values()
        );

        // Step 7: Combine all data for recommendations
        // Create seed artists and tracks from user's library
        const seedArtists = artistIds.slice(0, 3);

        const seedTracks = trackDetails
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, 3)
            .map(t => t.id);

        // Get search-based recommendations using the user's top artists/tracks as seeds
        const searchResults = await getRecommendations({
            seedArtists,
            seedTracks,
            seedGenres: genreSeed,
            limit: Math.floor(limit * 0.7), // Only get 70% from search
            ...moodFeatures,
            ...(market ? { market } : {})
        });

        // Combine with related artist tracks
        const combinedTracks = [
            ...(searchResults.tracks || []),
            ...uniqueRelatedTracks
        ];

        // Remove duplicates and shuffle for variety
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
        // Fallback to user's top tracks
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

// Interface for Hugging Face text generation API requests
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

// Generate a playlist directly from a mood using Hugging Face and Spotify
export const generateMoodPlaylistWithAI = async (
    mood: string,
    playlistName: string,
    songCount: number = 20,
    language: string = "any"
) => {
    const headers = await getSpotifyHeaders();

    try {
        // Step 1: Get user's top tracks and recently played tracks to enhance recommendations
        console.log(`Getting user's music profile for mood: ${mood} in language: ${language}`);

        // Get market code from language
        const market = getMarketFromLanguage(language);
        console.log(`Using market code for ${language}: ${market || 'none (global)'}`);

        let userTopTracks: any[] = [];
        let userRecentTracks: any[] = [];

        try {
            // Get top tracks
            const topTracksResponse = await fetch(
                `https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10`,
                { headers }
            );

            if (topTracksResponse.ok) {
                const topTracksData = await topTracksResponse.json();
                userTopTracks = topTracksData.items || [];
            }

            // Get recently played tracks
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
            // Continue with available data
        }

        // Step 2: Use Hugging Face to generate song suggestions based on mood and user's music
        console.log(`Generating ${songCount} song suggestions for mood: ${mood} in language: ${language}`);

        const API_URL = "https://api-inference.huggingface.co/models/gpt2";
        // Get the API key from environment variables
        const API_KEY = process.env.HUGGINGFACE_API_KEY;

        console.log("Using Hugging Face API key for generation:", API_KEY ? API_KEY.substring(0, 5) + "..." : "none");

        if (!API_KEY) {
            console.error("HUGGINGFACE_API_KEY is not defined in environment variables");
            // Instead of throwing an error, fall back to getAIMoodRecommendations
            const recommendations = await getAIMoodRecommendations(mood, songCount, language);

            // Create a playlist with these tracks
            const playlistDescription = `AI-generated playlist for ${mood} mood${language !== "any" ? ` in ${language}` : ""} based on your listening history`;
            const playlistData = await createPlaylist(playlistName, playlistDescription);

            // Add tracks to the playlist
            const trackUris = recommendations.tracks.map((track: any) => track.uri);
            await addTracksToPlaylist(playlistData.id, trackUris);

            return {
                playlist: playlistData,
                tracks: trackUris.length,
                fallback: true,
                message: "Used fallback mood recommendations due to missing Hugging Face API key"
            };
        }

        // Create a prompt that includes user's music preferences
        let prompt = `Here are some great songs that capture a ${mood} mood:\n1.`;

        // Add language preference to the prompt if a specific language is selected
        if (language !== "any") {
            const languageName = language.toUpperCase();
            // Create a more specific prompt for language
            prompt = `Here are some great songs in the ${languageName} language that capture a ${mood} mood. Please only suggest songs that are specifically in ${languageName}:\n1.`;
        }

        // Enhance prompt with user's music preferences if available
        if (userTopTracks.length > 0 || userRecentTracks.length > 0) {
            // Select some representative tracks from user's library
            const combinedTracks = [...userTopTracks, ...userRecentTracks]
                .filter((track, index, self) =>
                    index === self.findIndex((t) => t.id === track.id)
                )
                .slice(0, 5);

            if (combinedTracks.length > 0) {
                const trackExamples = combinedTracks.map(track =>
                    `${track.artists[0]?.name} - ${track.name}`
                ).join(", ");

                if (language !== "any") {
                    const languageName = language.toUpperCase();
                    prompt = `Based on your enjoyment of songs like ${trackExamples}, here are some ${mood} songs in the ${languageName} language. Please only suggest songs that are specifically in ${languageName}:\n1.`;
                } else {
                    prompt = `Based on your enjoyment of songs like ${trackExamples}, here are some ${mood} songs you might like:\n1.`;
                }
            }
        }

        const huggingFaceResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: songCount * 30, // Enough tokens to generate multiple song suggestions
                    temperature: 0.8,
                    top_p: 0.9,
                    repetition_penalty: 1.2
                }
            } as HuggingFaceTextGenRequest)
        });

        if (!huggingFaceResponse.ok) {
            throw new Error(`Hugging Face API error: ${huggingFaceResponse.statusText}`);
        }

        const result = await huggingFaceResponse.json();
        const generatedText = result[0]?.generated_text || "";

        // Step 3: Parse the generated text to extract song suggestions
        // The format should be like "1. Artist - Song Title"
        const songSuggestions: { artist: string, title: string; }[] = [];

        // Use regex to find patterns like "NUMBER. Artist - Title" or "NUMBER. Title by Artist"
        const songRegex = /\d+\.\s+(.*?)\s+[-–—]\s+(.*?)(?=\n\d+\.|\n$|$)|(\d+\.\s+(.*?)\s+by\s+(.*?)(?=\n\d+\.|\n$|$))/gi;
        let match;

        while ((match = songRegex.exec(generatedText)) !== null && songSuggestions.length < songCount) {
            if (match[1] && match[2]) {
                // Format: "NUMBER. Artist - Title"
                songSuggestions.push({
                    artist: match[1].trim(),
                    title: match[2].trim()
                });
            } else if (match[4] && match[5]) {
                // Format: "NUMBER. Title by Artist"
                songSuggestions.push({
                    title: match[4].trim(),
                    artist: match[5].trim()
                });
            }
        }

        // If regex didn't find enough songs, try another approach to parse the text
        if (songSuggestions.length < 5) {
            // Split by newlines and look for lines that start with numbers
            const lines: string[] = generatedText.split('\n').filter((line: string) => /^\d+\./.test(line));

            for (const line of lines) {
                // Try to extract artist and title information
                if (line.includes(" - ")) {
                    const parts = line.split(" - ");
                    const artistPart = parts[0].replace(/^\d+\.\s+/, "").trim();
                    const titlePart = parts[1].trim();
                    songSuggestions.push({
                        artist: artistPart,
                        title: titlePart
                    });
                } else if (line.includes(" by ")) {
                    const parts = line.split(" by ");
                    const titlePart = parts[0].replace(/^\d+\.\s+/, "").trim();
                    const artistPart = parts[1].trim();
                    songSuggestions.push({
                        title: titlePart,
                        artist: artistPart
                    });
                }
            }
        }

        console.log(`AI suggested ${songSuggestions.length} songs`);

        // Step 4: Search for these songs on Spotify
        const trackUris: string[] = [];

        // Add market parameter based on language selection for Spotify search
        const marketParam = market ? `&market=${market}` : "";

        for (const song of songSuggestions) {
            try {
                const searchQuery = `${song.title} artist:${song.artist}`;
                const searchResponse = await fetch(
                    `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1${marketParam}`,
                    { headers }
                );

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.tracks.items.length > 0) {
                        trackUris.push(searchData.tracks.items[0].uri);
                        console.log(`Found track: ${song.artist} - ${song.title}`);
                    }
                }
            } catch (error) {
                console.error(`Error searching for track: ${song.artist} - ${song.title}`, error);
            }
        }

        // Step 5: Find related tracks from Spotify's recommendation engine to complement the AI suggestions
        if (trackUris.length > 0) {
            try {
                const aiFoundTracks = trackUris.slice(0, 5); // Use up to 5 successfully found tracks as seeds

                const recommendationsResponse = await fetch(
                    `https://api.spotify.com/v1/recommendations?seed_tracks=${aiFoundTracks.join(',')}&limit=${Math.max(5, songCount - trackUris.length)}${marketParam}`,
                    { headers }
                );

                if (recommendationsResponse.ok) {
                    const recommendationsData = await recommendationsResponse.json();
                    const relatedTrackUris = recommendationsData.tracks.map((track: any) => track.uri);

                    // Add unique related tracks to our list
                    for (const uri of relatedTrackUris) {
                        if (!trackUris.includes(uri)) {
                            trackUris.push(uri);
                        }
                    }

                    console.log(`Added ${relatedTrackUris.length} related tracks from Spotify recommendations`);
                }
            } catch (error) {
                console.error("Error getting related tracks:", error);
            }
        }

        // If we still don't have enough tracks, search for the mood directly
        if (trackUris.length < 5) {
            console.log("Not enough AI-suggested songs found. Searching for mood directly.");
            const moodSearchResponse = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(mood)}&type=track&limit=${songCount - trackUris.length}${marketParam}`,
                { headers }
            );

            if (moodSearchResponse.ok) {
                const moodSearchData = await moodSearchResponse.json();
                const moodTrackUris = moodSearchData.tracks.items.map((track: any) => track.uri);

                // Add unique mood tracks
                for (const uri of moodTrackUris) {
                    if (!trackUris.includes(uri)) {
                        trackUris.push(uri);
                    }
                }
            }
        }

        if (trackUris.length === 0) {
            throw new Error("Could not find any tracks for the requested mood");
        }

        // Step 6: Create a playlist with these songs
        // First get the user's ID
        const userResponse = await fetch("https://api.spotify.com/v1/me", { headers });
        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
        }

        const userData = await userResponse.json();

        // Create the playlist
        const playlistDescription = `AI-generated playlist for ${mood} mood${language !== "any" ? ` in ${language}` : ""} based on your music preferences`;
        const playlistResponse = await fetch(
            `https://api.spotify.com/v1/users/${userData.id}/playlists`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: playlistName || `${mood} Mood - AI Generated${language !== "any" ? ` (${language})` : ""}`,
                    description: playlistDescription,
                    public: true,
                }),
            }
        );

        if (!playlistResponse.ok) {
            throw new Error(`Failed to create playlist: ${playlistResponse.statusText}`);
        }

        const playlistData = await playlistResponse.json();

        // Add tracks to the playlist
        await addTracksToPlaylist(playlistData.id, trackUris);

        return {
            playlist: playlistData,
            tracks: trackUris.length,
            suggestedSongs: songSuggestions
        };
    } catch (error) {
        console.error("Error in generateMoodPlaylistWithAI:", error);
        throw error;
    }
}; 