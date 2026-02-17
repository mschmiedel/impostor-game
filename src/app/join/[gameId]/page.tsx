
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JoinGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/joinGame/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Spiel nicht gefunden");
        throw new Error("Fehler beim Beitreten");
      }

      const data = await res.json();
      // Store player ID
      localStorage.setItem(`impostor_player_${gameId}`, data.playerId);
      
      router.push(`/game/${gameId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6 mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center text-indigo-600">Spiel beitreten</h1>
      <p className="text-center text-gray-500 mb-4">Game ID: {gameId}</p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Fehler: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Dein Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? "Beitreten..." : "Beitreten"}
        </button>
      </form>
    </div>
  );
}
