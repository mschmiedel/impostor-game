
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/shared/i18n/LanguageContext";

export default function JoinGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  
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
        if (res.status === 404) throw new Error(t("gameNotFound"));
        throw new Error(t("errorJoining"));
      }

      const data = await res.json();
      // Store player ID and Secret
      localStorage.setItem(`impostor_player_${gameId}`, data.playerId);
      localStorage.setItem(`impostor_secret_${gameId}`, data.playerSecret);
      
      router.push(`/game/${gameId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 bg-gray-50 dark:bg-slate-900 transition-colors duration-200 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden p-6 transition-colors duration-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-400">{t("joinGameTitle")}</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-4 text-sm font-mono break-all">Game ID: {gameId}</p>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">{t("error")}: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("yourName")}</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
          >
            {loading ? t("joining") : t("joinGameButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
