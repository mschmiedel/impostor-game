
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    creatorName: "",
    ageOfYoungestPlayer: 10,
    language: "de-DE"
  });

  const languages = [
    { code: "de-DE", label: "Deutsch" },
    { code: "en-US", label: "English" },
    { code: "es-ES", label: "Español" },
    { code: "fr-FR", label: "Français" },
    { code: "it-IT", label: "Italiano" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/createGame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create game");

      const data = await res.json();
      // Redirect to game page with adminPwd (store in URL or localStorage? 
      // Design implies URL or just redirect. 
      // API returns: { gameId, status, adminPwd, playerId, language }
      // We need adminPwd to control the game.
      
      // For now, let's pass it in query params or localStorage. 
      // Storing in localStorage is safer for refresh.
      localStorage.setItem(`impostor_admin_${data.gameId}`, data.adminPwd);
      localStorage.setItem(`impostor_player_${data.gameId}`, data.playerId);
      
      router.push(`/game/${data.gameId}`);
    } catch (err) {
      console.error(err);
      alert("Error creating game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
      <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">Impostor Game</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Neues Spiel erstellen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Dein Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border"
              value={formData.creatorName}
              onChange={(e) => setFormData({...formData, creatorName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Alter des jüngsten Spielers</label>
            <input
              type="number"
              min="5"
              max="100"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border"
              value={formData.ageOfYoungestPlayer}
              onChange={(e) => setFormData({...formData, ageOfYoungestPlayer: parseInt(e.target.value)})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sprache</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border"
              value={formData.language}
              onChange={(e) => setFormData({...formData, language: e.target.value})}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "Erstelle Spiel..." : "Spiel starten"}
          </button>
        </form>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">Spiel beitreten</h2>
        <div className="space-y-4">
           <p className="text-sm text-gray-500">Hast du einen Code? Gib ihn hier ein:</p>
           {/* Simple input to redirect to join page */}
           <JoinGameInput />
        </div>
      </div>
    </div>
  );
}

function JoinGameInput() {
  const [gameId, setGameId] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId.trim()) {
      router.push(`/join/${gameId.trim()}`);
    }
  };

  return (
    <form onSubmit={handleJoin} className="flex gap-2">
      <input
        type="text"
        placeholder="Game UUID"
        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />
      <button
        type="submit"
        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
      >
        Beitreten
      </button>
    </form>
  );
}
