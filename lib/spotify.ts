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
    const headers = await getSpotifyHeaders();

    try {
        const seedParams = [
            ...(seedTracks.length > 0 ? [`seed_tracks=${seedTracks.slice(0, 5).join(',')}`] : []),
            ...(seedArtists.length > 0 ? [`seed_artists=${seedArtists.slice(0, 5).join(',')}`] : []),
            ...(seedGenres.length > 0 ? [`seed_genres=${seedGenres.slice(0, 5).join(',')}`] : [])
        ].join('&');

        const targetParams = [
            ...(targetEnergy !== undefined ? [`target_energy=${targetEnergy}`] : []),
            ...(targetDanceability !== undefined ? [`target_danceability=${targetDanceability}`] : []),
            ...(targetValence !== undefined ? [`target_valence=${targetValence}`] : [])
        ].join('&');

        const marketParam = market ? `&market=${market}` : '';

        const url = `https://api.spotify.com/v1/recommendations?${seedParams}&${targetParams}&limit=${limit}${marketParam}`;

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }

        const data = await response.json();

        if (market) {
            data.tracks = data.tracks.filter((track: any) => {
                return track.available_markets?.includes(market);
            });
        }

        return {
            tracks: data.tracks,
            seeds: data.seeds
        };
    } catch (error) {
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
    language: string = "any"
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

        console.log(`Generating ${songCount} song suggestions for mood: ${mood} in language: ${language}`);

        // Use a more advanced model
        const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";
        const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

        console.log("Using Mistral-7B model for generation:", API_KEY ? API_KEY.substring(0, 5) + "..." : "none");

        if (!API_KEY) {
            console.error("HUGGINGFACE_API_KEY is not defined in environment variables");
            const recommendations = await getAIMoodRecommendations(mood, songCount, language);

            const playlistDescription = `AI-generated playlist for ${mood} mood${language !== "any" ? ` in ${language}` : ""} based on your listening history`;
            const playlistData = await createPlaylist(playlistName, playlistDescription);

            const trackUris = recommendations.tracks.map((track: any) => track.uri);
            await addTracksToPlaylist(playlistData.id, trackUris);

            return {
                playlist: playlistData,
                tracks: trackUris.length,
                fallback: true,
                message: "Used fallback mood recommendations due to missing Hugging Face API key"
            };
        }

        // Enhanced prompt with more context and structure
        let prompt = `Create a list of ${songCount} songs that perfectly match a ${mood} mood. `;
        prompt += `The songs should be well-known and popular in their respective genres. `;

        if (language !== "any") {
            const languageName = language.toUpperCase();
            prompt += `All songs must be in the ${languageName} language. `;
        }

        if (userTopTracks.length > 0 || userRecentTracks.length > 0) {
            const combinedTracks = [...userTopTracks, ...userRecentTracks]
                .filter((track, index, self) =>
                    index === self.findIndex((t) => t.id === track.id)
                )
                .slice(0, 5);

            if (combinedTracks.length > 0) {
                const trackExamples = combinedTracks.map(track =>
                    `${track.artists[0]?.name} - ${track.name}`
                ).join(", ");

                prompt += `The user enjoys songs like: ${trackExamples}. `;
                prompt += `Please suggest similar songs that match the ${mood} mood. `;
            }
        }

        prompt += `Format the response as a numbered list with each entry in the format: "Artist Name - Song Title". `;
        prompt += `Only include real, existing songs. Here's the list:\n1.`;

        const huggingFaceResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: songCount * 50, // Increased token limit
                    temperature: 0.7, // Slightly lower for more focused results
                    top_p: 0.9,
                    repetition_penalty: 1.2,
                    do_sample: true,
                    top_k: 50
                }
            } as HuggingFaceTextGenRequest)
        });

        if (!huggingFaceResponse.ok) {
            throw new Error(`Hugging Face API error: ${huggingFaceResponse.statusText}`);
        }

        const result = await huggingFaceResponse.json();
        const generatedText = result[0]?.generated_text || "";

        // Enhanced song suggestion parsing
        const songSuggestions: { artist: string, title: string; }[] = [];
        const songRegex = /^\d+\.\s+([^–—-]+)\s*[-–—]\s*([^–—-]+)$/gmi;
        let match;

        while ((match = songRegex.exec(generatedText)) !== null && songSuggestions.length < songCount) {
            if (match[1] && match[2]) {
                songSuggestions.push({
                    artist: match[1].trim(),
                    title: match[2].trim()
                });
            }
        }

        // Fallback parsing if the first method doesn't find enough songs
        if (songSuggestions.length < songCount) {
            const lines = generatedText.split('\n');
            for (const line of lines) {
                if (line.match(/^\d+\./)) {
                    const parts = line.split(/[-–—]/);
                    if (parts.length >= 2) {
                        const artist = parts[0].replace(/^\d+\.\s*/, '').trim();
                        const title = parts.slice(1).join('').trim();
                        if (artist && title && !songSuggestions.some(s => s.artist === artist && s.title === title)) {
                            songSuggestions.push({ artist, title });
                        }
                    }
                }
            }
        }

        console.log(`AI suggested ${songSuggestions.length} songs`);

        const trackUris: string[] = [];

        const marketParam = market ? `&market=${market}` : "";

        for (const song of songSuggestions) {
            try {
                // First try with exact artist search
                const exactSearchQuery = `track:"${song.title}" artist:"${song.artist}"`;
                let searchResponse = await fetch(
                    `https://api.spotify.com/v1/search?q=${encodeURIComponent(exactSearchQuery)}&type=track&limit=5${marketParam}`,
                    { headers }
                );

                let foundExactMatch = false;
                let foundTrack = null;

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.tracks.items.length > 0) {
                        // Try to find exact artist match
                        foundTrack = searchData.tracks.items.find((track: any) =>
                            track.artists.some((artist: any) =>
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

                // If exact match not found, try with more general search
                if (!foundExactMatch) {
                    const generalSearchQuery = `${song.title} ${song.artist}`;
                    searchResponse = await fetch(
                        `https://api.spotify.com/v1/search?q=${encodeURIComponent(generalSearchQuery)}&type=track&limit=10${marketParam}`,
                        { headers }
                    );

                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        if (searchData.tracks.items.length > 0) {
                            // Calculate similarity score for each result to find best match
                            const sortedResults = searchData.tracks.items.sort((a: any, b: any) => {
                                // Check if title matches
                                const aTitle = a.name.toLowerCase();
                                const bTitle = b.name.toLowerCase();
                                const targetTitle = song.title.toLowerCase();

                                // Check if artist matches
                                const aArtistMatch = a.artists.some((artist: any) =>
                                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                                );

                                const bArtistMatch = b.artists.some((artist: any) =>
                                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                                );

                                // Prioritize artist match then title match
                                if (aArtistMatch && !bArtistMatch) return -1;
                                if (!aArtistMatch && bArtistMatch) return 1;

                                // If both or neither match artist, compare title similarity
                                const aTitleSimilarity = aTitle === targetTitle ? 2 :
                                    (aTitle.includes(targetTitle) || targetTitle.includes(aTitle) ? 1 : 0);
                                const bTitleSimilarity = bTitle === targetTitle ? 2 :
                                    (bTitle.includes(targetTitle) || targetTitle.includes(bTitle) ? 1 : 0);

                                return bTitleSimilarity - aTitleSimilarity;
                            });

                            foundTrack = sortedResults[0];
                            console.log(`Found best match: ${foundTrack.artists[0].name} - ${foundTrack.name} (original request: ${song.artist} - ${song.title})`);
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

                const recommendationsResponse = await fetch(
                    `https://api.spotify.com/v1/recommendations?seed_tracks=${aiFoundTracks.join(',')}&limit=${Math.max(5, songCount - trackUris.length)}${marketParam}`,
                    { headers }
                );

                if (recommendationsResponse.ok) {
                    const recommendationsData = await recommendationsResponse.json();
                    const relatedTrackUris = recommendationsData.tracks.map((track: any) => track.uri);

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

        if (trackUris.length < 5) {
            console.log("Not enough AI-suggested songs found. Searching for mood directly.");
            const moodSearchResponse = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(mood)}&type=track&limit=${songCount - trackUris.length}${marketParam}`,
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
            throw new Error("Could not find any tracks for the requested mood");
        }

        const userResponse = await fetch("https://api.spotify.com/v1/me", { headers });
        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
        }

        const userData = await userResponse.json();

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

export const generateCustomPromptPlaylist = async (
    userPrompt: string,
    playlistName: string,
    songCount: number = 20,
    language: string = "any"
) => {
    const headers = await getSpotifyHeaders();

    try {
        const market = getMarketFromLanguage(language);
        console.log(`Using market code for ${language}: ${market || 'none (global)'}`);

        // Use Mistral-7B model for better understanding of user prompts
        const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";
        const API_KEY = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

        if (!API_KEY) {
            throw new Error("HUGGINGFACE_API_KEY is not defined in environment variables");
        }

        // Enhanced prompt for the AI
        const systemPrompt = `You are a music expert. Analyze the following user request and suggest ${songCount} songs that match the description. 
        Consider the following aspects from the user's prompt:
        1. Genre preferences
        2. Artist mentions
        3. Mood or atmosphere
        4. Specific song characteristics
        5. Language preferences
        6. Any number provided by the user like top 10, top 20, etc.
        Format the response as a numbered list with each entry in the format: "Artist Name - Song Title".
        Only include real, existing songs. Here's the list:\n1.`;

        const fullPrompt = `${systemPrompt}\nUser Request: ${userPrompt}`;

        const huggingFaceResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: fullPrompt,
                parameters: {
                    max_new_tokens: songCount * 50,
                    temperature: 0.7,
                    top_p: 0.9,
                    repetition_penalty: 1.2,
                    do_sample: true,
                    top_k: 50
                }
            } as HuggingFaceTextGenRequest)
        });

        if (!huggingFaceResponse.ok) {
            throw new Error(`Hugging Face API error: ${huggingFaceResponse.statusText}`);
        }

        const result = await huggingFaceResponse.json();
        const generatedText = result[0]?.generated_text || "";

        // Parse the AI's response
        const songSuggestions: { artist: string, title: string; }[] = [];
        const songRegex = /^\d+\.\s+([^–—-]+)\s*[-–—]\s*([^–—-]+)$/gmi;
        let match;

        while ((match = songRegex.exec(generatedText)) !== null && songSuggestions.length < songCount) {
            if (match[1] && match[2]) {
                songSuggestions.push({
                    artist: match[1].trim(),
                    title: match[2].trim()
                });
            }
        }

        console.log(`AI suggested ${songSuggestions.length} songs based on user prompt`);

        // Search for the suggested songs on Spotify
        const trackUris: string[] = [];
        const marketParam = market ? `&market=${market}` : "";

        for (const song of songSuggestions) {
            try {
                // First try with exact artist search
                const exactSearchQuery = `track:"${song.title}" artist:"${song.artist}"`;
                let searchResponse = await fetch(
                    `https://api.spotify.com/v1/search?q=${encodeURIComponent(exactSearchQuery)}&type=track&limit=5${marketParam}`,
                    { headers }
                );

                let foundExactMatch = false;
                let foundTrack = null;

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.tracks.items.length > 0) {
                        // Try to find exact artist match
                        foundTrack = searchData.tracks.items.find((track: any) =>
                            track.artists.some((artist: any) =>
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

                // If exact match not found, try with more general search
                if (!foundExactMatch) {
                    const generalSearchQuery = `${song.title} ${song.artist}`;
                    searchResponse = await fetch(
                        `https://api.spotify.com/v1/search?q=${encodeURIComponent(generalSearchQuery)}&type=track&limit=10${marketParam}`,
                        { headers }
                    );

                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        if (searchData.tracks.items.length > 0) {
                            // Calculate similarity score for each result to find best match
                            const sortedResults = searchData.tracks.items.sort((a: any, b: any) => {
                                // Check if title matches
                                const aTitle = a.name.toLowerCase();
                                const bTitle = b.name.toLowerCase();
                                const targetTitle = song.title.toLowerCase();

                                // Check if artist matches
                                const aArtistMatch = a.artists.some((artist: any) =>
                                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                                );

                                const bArtistMatch = b.artists.some((artist: any) =>
                                    artist.name.toLowerCase() === song.artist.toLowerCase() ||
                                    artist.name.toLowerCase().includes(song.artist.toLowerCase()) ||
                                    song.artist.toLowerCase().includes(artist.name.toLowerCase())
                                );

                                // Prioritize artist match then title match
                                if (aArtistMatch && !bArtistMatch) return -1;
                                if (!aArtistMatch && bArtistMatch) return 1;

                                // If both or neither match artist, compare title similarity
                                const aTitleSimilarity = aTitle === targetTitle ? 2 :
                                    (aTitle.includes(targetTitle) || targetTitle.includes(aTitle) ? 1 : 0);
                                const bTitleSimilarity = bTitle === targetTitle ? 2 :
                                    (bTitle.includes(targetTitle) || targetTitle.includes(bTitle) ? 1 : 0);

                                return bTitleSimilarity - aTitleSimilarity;
                            });

                            foundTrack = sortedResults[0];
                            console.log(`Found best match: ${foundTrack.artists[0].name} - ${foundTrack.name} (original request: ${song.artist} - ${song.title})`);
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

        // Create the playlist
        const userResponse = await fetch("https://api.spotify.com/v1/me", { headers });
        if (!userResponse.ok) {
            throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
        }

        const userData = await userResponse.json();

        const playlistDescription = `AI-generated playlist based on your custom request: "${userPrompt}"`;
        const playlistResponse = await fetch(
            `https://api.spotify.com/v1/users/${userData.id}/playlists`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: playlistName || "Custom AI Playlist",
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
            suggestedSongs: songSuggestions
        };
    } catch (error) {
        console.error("Error in generateCustomPromptPlaylist:", error);
        throw error;
    }
}; 