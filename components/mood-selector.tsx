"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Brain,
  Coffee,
  Flame,
  Heart,
  Music2,
  PartyPopper,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";

const moods = [
  { id: "happy", icon: Sun, label: "Happy", gradient: "from-yellow-500 to-amber-400" },
  { id: "energetic", icon: Zap, label: "Energetic", gradient: "from-spotify-purple to-violet-500" },
  { id: "romantic", icon: Heart, label: "Romantic", gradient: "from-red-500 to-pink-500" },
  { id: "focus", icon: Brain, label: "Focus", gradient: "from-blue-500 to-cyan-400" },
  { id: "chill", icon: Coffee, label: "Chill", gradient: "from-spotify-green to-teal-500" },
  { id: "party", icon: PartyPopper, label: "Party", gradient: "from-spotify-orange to-pink-500" },
  { id: "workout", icon: Flame, label: "Workout", gradient: "from-orange-500 to-red-500" },
  { id: "magical", icon: Sparkles, label: "Magical", gradient: "from-indigo-500 to-spotify-purple" },
  { id: "jazzy", icon: Music2, label: "Jazzy", gradient: "from-teal-500 to-spotify-cyan" },
];

interface MoodSelectorProps {
  selectedMood: string | null;
  onSelectMood: (mood: string) => void;
}

export function MoodSelector({ selectedMood, onSelectMood }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {moods.map((mood) => {
        const Icon = mood.icon;
        const isSelected = selectedMood === mood.id;

        return (
          <Card
            key={mood.id}
            className={`
              cursor-pointer p-0 overflow-hidden transition-all hover-scale bg-spotify-lightgray border-none shadow-md
              ${isSelected ? 'ring-2 ring-spotify-green ring-offset-2 ring-offset-spotify-black' : ''}
            `}
            onClick={() => onSelectMood(mood.id)}
          >
            <div className="relative h-full p-6">
              {/* Background gradient effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} opacity-${isSelected ? '20' : '10'} transition-opacity`} />

              <div className="flex flex-col items-center space-y-4 relative z-10">
                <div className={`
                  flex items-center justify-center w-14 h-14 rounded-full 
                  bg-gradient-to-br ${mood.gradient} p-3 transition-transform
                  ${isSelected ? 'scale-110' : ''}
                `}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{mood.label}</h3>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}