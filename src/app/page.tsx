
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, Locale } from "@/shared/i18n/LanguageContext";

export default function Home() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  // Initialize form data
  const [formData, setFormData] = useState({
    creatorName: "",
    ageOfYoungestPlayer: 10,
    language: language // Initialize with current global language
  });

  // Update form language when global language changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, language }));
  }, [language]);

  const languages = [
    { code: "de-DE", label: "Deutsch" },
    { code: "en-US", label: "English" },
    { code: "es-ES", label: "Español" },
    { code: "fr-FR", label: "Français" },
    { code: "it-IT", label: "Italiano" }
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Locale;
    setLanguage(newLang); // Update global UI language
    // Form data will be updated via useEffect
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/createGame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error(t("failedToCreate"));

      const data = await res.json();
      
      // Store player Secret instead of adminPwd
      localStorage.setItem(`impostor_secret_${data.gameId}`, data.playerSecret);
      localStorage.setItem(`impostor_player_${data.gameId}`, data.playerId);
      
      router.push(`/game/${data.gameId}`);
    } catch (err) {
      console.error(err);
      alert(t("errorCreating"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* Language Selector Top Right */}
      <div className="absolute top-4 right-4">
        <select
          data-testid="language-select"
          className="block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
          value={language}
          onChange={handleLanguageChange}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-400">{t("title")}</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t("createGameTitle")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("yourName")}</label>
              <input
                data-testid="creator-name-input"
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                value={formData.creatorName}
                onChange={(e) => setFormData({...formData, creatorName: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("youngestPlayerAge")}</label>
              <input
                data-testid="age-input"
                type="number"
                min="5"
                max="100"
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700"
                value={formData.ageOfYoungestPlayer}
                onChange={(e) => setFormData({...formData, ageOfYoungestPlayer: parseInt(e.target.value)})}
              />
            </div>

            <button
              data-testid="create-game-btn"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? t("creatingGame") : t("createGameButton")}
            </button>
          </form>
        </div>

        <div className="border-t dark:border-slate-700 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t("joinGameTitle")}</h2>
          <div className="space-y-4">
             <p className="text-sm text-gray-500 dark:text-gray-400">{t("joinGameText")}</p>
             <JoinGameInput t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinGameInput({ t }: { t: any }) {
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
        data-testid="join-game-id-input"
        type="text"
        placeholder={t("joinGamePlaceholder")}
        className="flex-1 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />
      <button
        data-testid="join-game-btn"
        type="submit"
        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 transition-colors"
      >
        {t("joinGameButton")}
      </button>
    </form>
  );
}
