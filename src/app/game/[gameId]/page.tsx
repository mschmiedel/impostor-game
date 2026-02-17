
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from "@/shared/i18n/LanguageContext";

type Player = {
  id: string;
  name: string;
};

type TurnDetails = {
  gameId: string;
  status: "JOINING" | "STARTED" | "FINISHED";
  players: Player[];
  actualTurn: {
    role: "CIVILIAN" | "IMPOSTOR" | null;
    word: string | null;
  } | null;
  pastTurns: {
    word: string;
    impostors: string[];
    civilians: string[];
  }[];
};

export default function GameRoom() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [game, setGame] = useState<TurnDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);
  
  useEffect(() => {
    // Check credentials
    const adminPwd = localStorage.getItem(`impostor_admin_${gameId}`);
    const pid = localStorage.getItem(`impostor_player_${gameId}`);
    
    if (adminPwd) setIsAdmin(true);
    setPlayerId(pid);

    if (!pid) {
       router.push(`/join/${gameId}`);
       return;
    }

    const fetchGame = async () => {
      try {
        // Use getTurnDetails for everyone
        const url = `/api/getTurnDetails/${gameId}/${pid}`;
        const res = await fetch(url);
        
        if (res.status === 404) {
          setError(t("gameNotFound"));
          return;
        }
        
        if (res.ok) {
           const data = await res.json();
           setGame(data);
           setError("");
        } else {
           setError(t("error"));
        }
      } catch (err) {
        console.error("Polling error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
    const interval = setInterval(fetchGame, 2000); // Poll every 2s

    return () => clearInterval(interval);
  }, [gameId, router, t]);

  const apiCall = async (endpoint: string) => {
    if (!isAdmin) return;
    const adminPwd = localStorage.getItem(`impostor_admin_${gameId}`);
    await fetch(`/api/${endpoint}/${gameId}?adminPwd=${adminPwd}`, { method: "POST" });
  };

  const startGame = () => apiCall("startGame");
  const nextTurn = () => apiCall("nextTurn");
  const finishGame = () => apiCall("finishGame");

  if (loading && !game) return <div className="p-10 text-center">{t("loadingGame")}</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
  if (!game) return <div className="p-10 text-center">{t("noData")}</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 relative min-h-[50vh]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <h1 className="text-2xl font-bold text-indigo-600">{t("room")}: {gameId.substring(0,8)}...</h1>
        <div className="flex gap-2 items-center flex-wrap justify-center">
            <button 
              onClick={() => setShowHistory(!showHistory)} 
              className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors"
            >
               {showHistory ? t("hideHistory") : t("showHistory")}
            </button>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded">
              {t("status")}: <span className={game.status === 'STARTED' ? 'text-green-600' : 'text-blue-600'}>{game.status}</span>
            </div>
        </div>
      </div>

      {/* HISTORY MODAL / SECTION */}
      {showHistory && (
         <div className="mb-6 bg-gray-50 p-4 rounded border animate-fadeIn">
            <h3 className="font-bold mb-2">{t("pastTurns")}</h3>
            {game.pastTurns.length === 0 ? <p className="text-gray-500 text-sm">{t("noPastTurns")}</p> : (
               <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
                  {game.pastTurns.map((turn, idx) => (
                     <li key={idx} className="border-b pb-2 last:border-0">
                        <span className="font-semibold text-indigo-700">{t("turn")} {idx + 1}:</span> {t("word")}: <strong>{turn.word}</strong>. 
                        <br/>
                        <span className="text-red-600">{t("impostor")}:</span> {turn.impostors.join(", ")}. 
                        <span className="text-blue-600">{t("civilians")}:</span> {turn.civilians.join(", ")}.
                     </li>
                  ))}
               </ul>
            )}
         </div>
      )}

      {/* LOBBY */}
      {game.status === 'JOINING' && (
        <div className="text-center py-10">
          <h2 className="text-xl mb-4">{t("waitingForPlayers")}</h2>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {game.players.map(p => (
              <div key={p.id} className="bg-gray-50 px-6 py-3 rounded shadow-sm flex items-center justify-center border border-gray-200">
                <span className={p.id === playerId ? "font-bold text-indigo-600" : "text-gray-700"}>{p.name} {p.id === playerId ? t("you") : ""}</span>
              </div>
            ))}
          </div>
          
          <div className="flex gap-4 justify-center flex-col sm:flex-row items-center">
             <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
                {t("copyLink")}
             </button>
             <button onClick={() => setShowQR(!showQR)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
                {showQR ? t("hideQR") : t("showQR")}
             </button>
             {isAdmin && (
                <button 
                  onClick={startGame}
                  disabled={game.players.length < 3}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {t("startGame")} ({game.players.length}/3 min)
                </button>
             )}
          </div>
          
          {showQR && currentUrl && (
             <div className="mt-6 flex justify-center animate-fadeIn p-4 bg-white rounded-lg border shadow-sm inline-block">
                <QRCodeSVG value={currentUrl} size={150} />
                <p className="mt-2 text-xs text-gray-500">{t("scanMe")}</p>
             </div>
          )}

           {isAdmin && game.players.length < 3 && <p className="text-sm text-gray-400 mt-2">{t("minPlayers")}</p>}
        </div>
      )}

      {/* ACTIVE GAME */}
      {(game.status === 'STARTED' || game.status === 'FINISHED') && (
        <div>
          <div className="mb-8">
             <h2 className="text-xl font-bold mb-4 text-center">{t("currentTurn")}</h2>
             <CurrentTurnDisplay game={game} t={t} />
          </div>

          {isAdmin && game.status !== 'FINISHED' && (
            <div className="flex gap-4 border-t pt-6 justify-center">
               <button onClick={nextTurn} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
                 {t("nextTurn")}
               </button>
               <button onClick={finishGame} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
                 {t("endGame")}
               </button>
            </div>
          )}
          
           {game.status === 'FINISHED' && (
              <div className="text-center py-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 mt-4 shadow-sm">
                <p className="text-lg font-bold">{t("gameEnded")}</p>
                <p className="mb-4">{t("hopeFun")}</p>
                <button onClick={() => router.push('/')} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">{t("newGame")}</button>
              </div>
           )}
        </div>
      )}
    </div>
  );
}

function CurrentTurnDisplay({ game, t }: { game: TurnDetails, t: any }) {
  if (!game.actualTurn) {
      if (game.status === 'FINISHED') return <div className="text-gray-500 italic text-center">{t("gameOver")}</div>;
      return <div className="text-gray-500 italic text-center animate-pulse">{t("waitingForTurn")}</div>;
  }

  const { role, word } = game.actualTurn;
  const isImpostor = role === 'IMPOSTOR';

  return (
    <div className="bg-slate-800 text-white p-8 rounded-xl text-center shadow-2xl max-w-lg mx-auto transform transition-all">
      <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">{t("yourRole")}</h3>
      <div className="text-5xl font-black mb-8 tracking-wider">
        {isImpostor ? <span className="text-red-500 drop-shadow-md">IMPOSTOR</span> : <span className="text-blue-400 drop-shadow-md">CIVILIAN</span>}
      </div>
      
      <div className="border-t border-slate-700 pt-8">
        <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-semibold">{t("yourSecretWord")}</h3>
        <div className="text-4xl font-mono bg-slate-900 inline-block px-8 py-4 rounded-lg border border-slate-700 shadow-inner">
           {isImpostor ? <span className="tracking-widest">???</span> : word}
        </div>
        {isImpostor ? (
            <p className="mt-4 text-sm text-red-300 font-medium">{t("findOthers")}</p>
        ) : (
            <p className="mt-4 text-sm text-blue-300 font-medium">{t("findImpostor")}</p>
        )}
      </div>
    </div>
  );
}
