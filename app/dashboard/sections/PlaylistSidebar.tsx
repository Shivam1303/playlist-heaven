"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Music, ExternalLink, Check, X } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Playlist, TempPlaylist } from "./types";

interface PlaylistSidebarProps {
    playlist: Playlist | null;
    tempPlaylist: TempPlaylist | null;
    loading: boolean;
    onSavePlaylist: () => void;
    onDiscardPlaylist: () => void;
}

export function PlaylistSidebar({
    playlist,
    tempPlaylist,
    loading,
    onSavePlaylist,
    onDiscardPlaylist
}: PlaylistSidebarProps) {
    return (
        <div className="lg:w-[420px]">
            <div className="sticky top-6">
                <Card className="bg-gradient-to-br from-black/90 to-slate-950/90 backdrop-blur-md border border-gray-800 shadow-xl rounded-xl h-[calc(100vh-3rem)] overflow-y-auto">
                    {playlist ? (
                        <>
                            <CardHeader className="border-b border-gray-800/70">
                                <CardTitle className="flex items-center">
                                    <Music className="mr-2 h-5 w-5 text-purple-400" />
                                    <span className="text-white">{playlist.name}</span>
                                    {tempPlaylist?.id === "preview" && (
                                        <span className="ml-2 text-xs font-normal px-2 py-1 bg-purple-500/20 rounded-full text-purple-300 border border-purple-500/30">
                                            Preview
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-gray-400">{playlist.description}</CardDescription>
                                {playlist.externalUrl !== "#" && (
                                    <Link
                                        href={playlist.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center mt-2 text-purple-400 hover:text-purple-300"
                                    >
                                        Open in Spotify <ExternalLink className="ml-1 h-4 w-4" />
                                    </Link>
                                )}
                            </CardHeader>
                            <CardContent className="py-4">
                                <div className="space-y-2">
                                    {playlist.tracks.map((track) => (
                                        <div
                                            key={track.id}
                                            className="flex items-center gap-4 rounded-lg p-2 hover:bg-white/5 transition-colors"
                                        >
                                            {track.image && (
                                                <img
                                                    src={track.image}
                                                    alt={track.album}
                                                    className="h-14 w-14 rounded-md object-cover shadow-md"
                                                />
                                            )}
                                            <div className="overflow-hidden">
                                                <div className="font-medium text-white truncate">{track.name}</div>
                                                <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                                                <div className="text-xs text-gray-500 truncate">{track.album}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-4 border-t border-gray-800/70 bg-gradient-to-r from-slate-900/50 to-gray-900/50">
                                <Button
                                    onClick={onSavePlaylist}
                                    className={`${tempPlaylist?.id === "preview"
                                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                        : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"} 
                    shadow-md`}
                                    disabled={loading || !tempPlaylist}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                        </>
                                    ) : tempPlaylist?.id === "preview" ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" /> Create in Spotify
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" /> Save Playlist
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={onDiscardPlaylist}
                                    variant="outline"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-red-900/50 hover:border-red-700/50"
                                    disabled={loading || !tempPlaylist}
                                >
                                    <X className="mr-2 h-4 w-4" /> Discard
                                </Button>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40 flex items-center justify-center mb-4">
                                <Music className="h-10 w-10 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-medium mb-3 text-white">No Playlist Yet</h3>
                            <p className="text-gray-400 max-w-xs">
                                Create a custom playlist or select a mood to generate one automatically
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
} 