"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoodSelector } from "@/components/mood-selector";
import { Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    { value: "zh", label: "Chinese" },
    { value: "ru", label: "Russian" },
    { value: "ar", label: "Arabic" },
    { value: "tr", label: "Turkish" },
];

interface MoodPlaylistSectionProps {
    selectedMood: string | null;
    selectedLanguage: string;
    loading: boolean;
    error: string | null;
    onSelectMood: (mood: string) => void;
    onSelectLanguage: (language: string) => void;
    onGeneratePlaylist: () => void;
    onGenerateAIPlaylist: () => void;
}

export function MoodPlaylistSection({
    selectedMood,
    selectedLanguage,
    loading,
    error,
    onSelectMood,
    onSelectLanguage,
    onGeneratePlaylist,
    onGenerateAIPlaylist
}: MoodPlaylistSectionProps) {
    return (
        <>
            <div className="mb-14 text-center">
                <h1 className="mb-4 text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Choose Your Mood</h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    Select a mood and let AI create the perfect playlist for you based on your preferences
                </p>
            </div>

            <div className="mb-12">
                <MoodSelector selectedMood={selectedMood} onSelectMood={onSelectMood} />
            </div>

            {/* Language Selector and Buttons - Row Layout */}
            <div className="mt-8 mb-12">
                {/* Main Row Container - wrapping div */}
                <div className="max-w-3xl mx-auto">
                    {/* <div className="mb-2 md:mb-0 md:ml-[68px]">
                        <label className="block text-sm font-medium text-gray-300">
                            Preferred Language
                        </label>
                    </div> */}

                    {/* Control Row */}
                    <div className="flex flex-col md:flex-row justify-center gap-4">
                        {/* Language Selector */}
                        {/* <div className="w-full md:w-64 shrink-0">
                            <Select
                                value={selectedLanguage}
                                onValueChange={onSelectLanguage}
                            >
                                <SelectTrigger className={`w-full h-[52px] bg-gradient-to-r from-gray-800/70 to-slate-800/70 backdrop-blur-sm border ${selectedLanguage !== "any" ? "border-green-400 ring-1 ring-green-400/20" : "border-slate-700"} shadow-md rounded-xl`}>
                                    <SelectValue placeholder="Select Language" />
                                </SelectTrigger>
                                <SelectContent className="bg-gradient-to-b from-gray-900 to-gray-950 border-slate-700">
                                    {languages.map((language) => (
                                        <SelectItem key={language.value} value={language.value}>
                                            {language.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div> */}

                        {/* Buttons */}
                        <div className="flex flex-row gap-4 w-full md:flex-1">
                            <Button
                                size="lg"
                                className="flex-1 h-[52px] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md rounded-xl px-4"
                                onClick={onGeneratePlaylist}
                                disabled={loading || !selectedMood}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
                                    </>
                                ) : (
                                    "Basic Playlist"
                                )}
                            </Button>

                            <Button
                                size="lg"
                                className="flex-1 h-[52px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md rounded-xl px-4"
                                onClick={onGenerateAIPlaylist}
                                disabled={loading || !selectedMood}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
                                    </>
                                ) : (
                                    "AI Playlist"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className={`mb-8 mx-auto max-w-xl rounded-lg p-4 text-center shadow-md ${error.includes("successfully") || error.includes("discarded") ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
                    {error}
                </div>
            )}
        </>
    );
} 