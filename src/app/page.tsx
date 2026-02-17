
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
      
      localStorage.setItem(`impostor_admin_${data.gameId}`, data.adminPwd);
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
    <div className="relative min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-gray-900">
      
      {/* Language Selector Top Right */}
      <div className="absolute top-4 right-4">
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border bg-white text-gray-900"
          value={language}
          onChange={handleLanguageChange}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6 text-gray-900">
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">{t("title")}</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{t("createGameTitle")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t("yourName")}</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 bg-white"
                value={formData.creatorName}
                onChange={(e) => setFormData({...formData, creatorName: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t("youngestPlayerAge")}</label>
              <input
                type="number"
                min="5"
                max="100"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 bg-white"
                value={formData.ageOfYoungestPlayer}
                onChange={(e) => setFormData({...formData, ageOfYoungestPlayer: parseInt(e.target.value)})}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? t("creatingGame") : t("createGameButton")}
            </button>
          </form>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{t("joinGameTitle")}</h2>
          <div className="space-y-4">
             <p className="text-sm text-gray-500">{t("joinGameText")}</p>
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
        type="text"
        placeholder={t("joinGamePlaceholder")}
        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border text-gray-900 bg-white"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />
      <button
        type="submit"
        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
      >
        {t("joinGameButton")}
      </button>
    </form>
  );
}
