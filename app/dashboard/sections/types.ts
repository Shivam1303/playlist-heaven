export interface Track {
    id: string;
    name: string;
    artist: string;
    album: string;
    image: string;
}

export interface Playlist {
    id: string;
    name: string;
    description: string;
    externalUrl: string;
    tracks: Track[];
}

export interface TempPlaylist {
    id: string;
    tracks: string[];
} 