"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomPlaylistSectionProps {
    loading: boolean;
    customPrompt: string;
    customPlaylistName: string;
    onPromptChange: (value: string) => void;
    onPlaylistNameChange: (value: string) => void;
    onCreateCustomPlaylist: () => void;
}

export function CustomPlaylistSection({
    loading,
    customPrompt,
    customPlaylistName,
    onPromptChange,
    onPlaylistNameChange,
    onCreateCustomPlaylist
}: CustomPlaylistSectionProps) {
    const [isCustomPlaylistOpen, setIsCustomPlaylistOpen] = useState(true);

    return (
        <div className="mt-4 mb-14 relative">
            <h2 className="mb-6 text-xl font-semibold text-white text-center">Or Create a Custom Playlist</h2>

            <Button
                variant="outline"
                onClick={() => setIsCustomPlaylistOpen(!isCustomPlaylistOpen)}
                className="mb-3 w-full max-w-xl mx-auto flex items-center bg-gradient-to-r from-purple-900/40 to-indigo-900/40 backdrop-blur-sm border border-purple-500/30 hover:bg-purple-800/30 text-white shadow-lg rounded-xl"
            >
                <div className="flex items-center justify-between w-full py-1.5 px-2">
                    <div className="flex items-center">
                        <Sparkles className="mr-2 h-6 w-6 text-purple-400" />
                        <span className="font-medium text-lg">Custom Playlist Creator</span>
                    </div>
                    <span className={`text-sm transition-transform duration-300 ${isCustomPlaylistOpen ? 'rotate-180' : ''}`}>▼</span>
                </div>
            </Button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCustomPlaylistOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/30 border border-purple-500/20 rounded-xl p-6 max-w-xl mx-auto backdrop-blur-sm shadow-xl">
                    <div className="space-y-5">
                        <div>
                            <Label htmlFor="playlist-name" className="text-gray-300 text-sm font-medium mb-1.5 block">
                                Playlist Name
                            </Label>
                            <Input
                                id="playlist-name"
                                value={customPlaylistName}
                                onChange={(e) => onPlaylistNameChange(e.target.value)}
                                placeholder="Enter playlist name"
                                className="bg-background/40 border-purple-500/30 focus:border-purple-400 text-white"
                            />
                        </div>
                        <div>
                            <Label htmlFor="playlist-prompt" className="text-gray-300 text-sm font-medium mb-1.5 block">
                                Describe Your Playlist
                            </Label>
                            <Textarea
                                id="playlist-prompt"
                                value={customPrompt}
                                onChange={(e) => onPromptChange(e.target.value)}
                                placeholder="Examples: 'Upbeat 80s rock for a workout', 'Acoustic guitar songs for focus', 'Relaxing jazz with female vocals'"
                                className="bg-background/40 border-purple-500/30 focus:border-purple-400 text-white resize-none min-h-32"
                            />
                            <p className="mt-2 text-xs text-gray-400">
                                Be specific about genres, artists, moods, eras, or any other preferences
                            </p>
                        </div>
                        <Button
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md"
                            onClick={onCreateCustomPlaylist}
                            disabled={loading || !customPrompt.trim()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Playlist...
                                </>
                            ) : (
                                "Create Custom Playlist"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 