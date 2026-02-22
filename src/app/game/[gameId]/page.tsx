
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from "@/shared/i18n/LanguageContext";

type PlayerDTO = {
  id: string;
  name: string;
  role: 'HOST' | 'PLAYER';
  isMe: boolean;
};

type TurnDTO = {
  word: string | null;
  role: 'IMPOSTOR' | 'CIVILIAN' | 'UNKNOWN';
  impostors?: string[];
  civilians?: string[];
  isCurrent: boolean;
};

type GameDTO = {
  gameId: string;
  joinCode?: string;
  status: "JOINING" | "STARTED" | "FINISHED";
  players: PlayerDTO[];
  turns: TurnDTO[];
};

export default function GameRoom() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [game, setGame] = useState<GameDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);
  
  // Wrapped in useCallback to be stable for useEffect dependency
  const getSecret = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`impostor_secret_${gameId}`);
    }
    return null;
  }, [gameId]);

  useEffect(() => {
    const secret = getSecret();
    if (!secret) {
       router.push(`/join/${gameId}`);
       return;
    }

    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/getGameDetails/${gameId}`, {
           headers: {
              'x-player-secret': secret
           }
        });
        
        if (res.status === 404) {
          setError(t("gameNotFound"));
          return;
        }
        
        if (res.status === 401 || res.status === 403) {
           setError(t("errorJoining")); 
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
    const interval = setInterval(fetchGame, 2000); 

    return () => clearInterval(interval);
  }, [gameId, router, t, getSecret]); // Added getSecret to dependencies

  const apiCall = async (endpoint: string) => {
    const secret = getSecret();
    if (!secret) return;
    
    await fetch(`/api/${endpoint}/${gameId}`, { 
        method: "POST",
        headers: {
            'x-player-secret': secret
        }
    });
  };

  const startGame = () => apiCall("startGame");
  const nextTurn = () => apiCall("nextTurn");
  const finishGame = () => apiCall("finishGame");

  const renamePlayer = async (playerId: string, newName: string) => {
    const secret = getSecret();
    if (!secret) return;
    await fetch(`/api/players/${gameId}/${playerId}`, {
      method: 'PATCH',
      headers: { 'x-player-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    });
  };

  const removePlayer = async (playerId: string) => {
    const secret = getSecret();
    if (!secret) return;
    await fetch(`/api/players/${gameId}/${playerId}`, {
      method: 'DELETE',
      headers: { 'x-player-secret': secret },
    });
  };

  if (loading && !game) return <div className="p-10 text-center dark:text-gray-200">{t("loadingGame")}</div>;
  if (error) return <div data-testid="error-message" className="p-10 text-center text-red-600 dark:text-red-400">{error}</div>;
  if (!game) return <div className="p-10 text-center dark:text-gray-200">{t("noData")}</div>;

  const me = game.players.find(p => p.isMe);
  const isHost = me?.role === 'HOST';
  const currentTurn = game.turns.find(t => t.isCurrent);
  
  const pastTurns = game.turns.filter(t => !t.isCurrent);

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden p-6 relative min-h-[50vh] transition-colors duration-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b dark:border-slate-700 pb-4 gap-4">
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t("room")}: {gameId.substring(0,8)}...</h1>
        <div className="flex gap-2 items-center flex-wrap justify-center">
            <button 
              data-testid="toggle-history-btn"
              onClick={() => setShowHistory(!showHistory)} 
              className="text-sm bg-gray-200 dark:bg-slate-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600 px-3 py-1 rounded transition-colors"
            >
               {showHistory ? t("hideHistory") : t("showHistory")}
            </button>
            <div className="text-sm font-mono bg-gray-100 dark:bg-slate-800 dark:text-gray-300 p-2 rounded">
              {t("status")}: <span data-testid="game-status" className={game.status === 'STARTED' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>{game.status}</span>
            </div>
        </div>
      </div>

      {showHistory && (
         <div data-testid="history-container" className="mb-6 bg-gray-50 dark:bg-slate-800 p-4 rounded border dark:border-slate-700 animate-fadeIn">
            <h3 className="font-bold mb-2 dark:text-gray-200">{t("pastTurns")}</h3>
            {pastTurns.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-sm">{t("noPastTurns")}</p> : (
               <ul className="space-y-2 text-sm max-h-60 overflow-y-auto custom-scrollbar">
                  {pastTurns.map((turn, idx) => (
                     <li key={idx} className="border-b dark:border-slate-700 pb-2 last:border-0 dark:text-gray-300">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400">{t("turn")} {idx + 1}:</span> {t("word")}: <strong>{turn.word || "???"}</strong>. 
                        <br/>
                        {turn.impostors && (
                             <>
                                <span className="text-red-600 dark:text-red-400">{t("impostor")}:</span> 
                                {game.players.filter(p => turn.impostors?.includes(p.id)).map(p => p.name).join(", ")}. 
                             </>
                        )}
                     </li>
                  ))}
               </ul>
            )}
         </div>
      )}

      {game.status === 'JOINING' && (
        <div className="text-center py-10">
          <h2 className="text-xl mb-4 dark:text-gray-200">{t("waitingForPlayers")}</h2>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {game.players.map(p => (
              <div key={p.id} data-testid={`player-badge-${p.id}`} className="bg-gray-50 dark:bg-slate-800 px-4 py-3 rounded shadow-sm flex items-center gap-2 border border-gray-200 dark:border-slate-700">
                {editingPlayerId === p.id ? (
                  <>
                    <input
                      data-testid="edit-name-input"
                      autoFocus
                      className="border border-indigo-400 rounded px-2 py-1 text-sm dark:bg-slate-700 dark:text-gray-200 focus:outline-none"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          await renamePlayer(p.id, editName);
                          setEditingPlayerId(null);
                        } else if (e.key === 'Escape') {
                          setEditingPlayerId(null);
                        }
                      }}
                    />
                    <button
                      data-testid="save-name-btn"
                      aria-label={t("saveName")}
                      onClick={async () => { await renamePlayer(p.id, editName); setEditingPlayerId(null); }}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 font-bold text-sm px-1"
                    >✓</button>
                    <button
                      aria-label={t("cancelEdit")}
                      onClick={() => setEditingPlayerId(null)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 font-bold text-sm px-1"
                    >✗</button>
                  </>
                ) : (
                  <>
                    <span className={p.isMe ? "font-bold text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}>
                      {p.name} {p.isMe ? t("you") : ""} {p.role === 'HOST' ? "👑" : ""}
                    </span>
                    {p.isMe && (
                      <button
                        data-testid="edit-name-btn"
                        aria-label={t("editName")}
                        onClick={() => { setEditingPlayerId(p.id); setEditName(p.name); }}
                        className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 text-sm px-1"
                      >✎</button>
                    )}
                    {isHost && !p.isMe && (
                      <button
                        data-testid="remove-player-btn"
                        aria-label={t("removePlayer")}
                        onClick={() => removePlayer(p.id)}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-400 font-bold text-sm px-1"
                      >✕</button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          
          {game.joinCode && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("joinCode")}</p>
              <div data-testid="join-code-display" className="text-5xl font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                {game.joinCode}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center flex-col sm:flex-row items-center">
             <button data-testid="copy-link-btn" onClick={() => navigator.clipboard.writeText(window.location.href)} className="bg-gray-200 dark:bg-slate-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
                {t("copyLink")}
             </button>
             <button data-testid="toggle-qr-btn" onClick={() => setShowQR(!showQR)} className="bg-gray-200 dark:bg-slate-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
                {showQR ? t("hideQR") : t("showQR")}
             </button>
             {isHost && (
                <button 
                  data-testid="start-game-btn"
                  onClick={startGame}
                  disabled={game.players.length < 3}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {t("startGame")} ({game.players.length}/3 min)
                </button>
             )}
          </div>
          
          {showQR && currentUrl && (
             <div data-testid="qr-code-container" className="mt-6 flex justify-center animate-fadeIn p-4 bg-white dark:bg-white rounded-lg border shadow-sm inline-block">
                {/* QR Code always needs white background to be scannable */}
                <QRCodeSVG value={currentUrl} size={150} />
                <p className="mt-2 text-xs text-gray-500">{t("scanMe")}</p>
             </div>
          )}

           {isHost && game.players.length < 3 && <p className="text-sm text-gray-400 mt-2">{t("minPlayers")}</p>}
        </div>
      )}

      {(game.status === 'STARTED' || game.status === 'FINISHED') && (
        <div>
          <div className="mb-8">
             <h2 className="text-xl font-bold mb-4 text-center dark:text-gray-200">
                {t("currentTurn")}
                {game.turns.length > 0 && <span className="ml-2 text-indigo-600 dark:text-indigo-400 text-lg font-normal">({t("round")} {game.turns.length})</span>}
             </h2>
             
             {currentTurn ? (
                <CurrentTurnDisplay turn={currentTurn} t={t} />
             ) : (
                 game.status === 'FINISHED' ? (
                    <div className="text-center p-4 bg-gray-100 dark:bg-slate-800 rounded">
                        <p className="font-bold text-lg dark:text-gray-200">{t("gameOver")}</p>
                        <p className="dark:text-gray-400">{t("checkHistory")}</p>
                    </div>
                 ) : (
                    <div className="text-gray-500 dark:text-gray-400 italic text-center animate-pulse">{t("waitingForTurn")}</div>
                 )
             )}
          </div>

          {isHost && game.status !== 'FINISHED' && (
            <div className="flex gap-4 border-t dark:border-slate-700 pt-6 justify-center">
               <button data-testid="next-turn-btn" onClick={nextTurn} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
                 {t("nextTurn")}
               </button>
               <button data-testid="finish-game-btn" onClick={finishGame} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
                 {t("endGame")}
               </button>
            </div>
          )}
          
           {game.status === 'FINISHED' && (
              <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-700 mt-4 shadow-sm">
                <p className="text-lg font-bold">{t("gameEnded")}</p>
                <p className="mb-4">{t("hopeFun")}</p>
                <button data-testid="new-game-btn" onClick={() => router.push('/')} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">{t("newGame")}</button>
              </div>
           )}
        </div>
      )}
    </div>
  );
}

function CurrentTurnDisplay({ turn, t }: { turn: TurnDTO, t: any }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isImpostor = turn.role === 'IMPOSTOR';

  const handleReveal = () => {
    if (isRevealed) return; // Already revealed

    setIsRevealed(true);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Hide after 2 seconds
    timeoutRef.current = setTimeout(() => {
      setIsRevealed(false);
    }, 2000);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      data-testid="reveal-card"
      onClick={handleReveal}
      className="relative bg-slate-800 text-white p-8 rounded-xl text-center shadow-2xl max-w-lg mx-auto transform transition-all cursor-pointer overflow-hidden min-h-[300px] flex flex-col justify-center select-none dark:border dark:border-slate-700"
    >
      {!isRevealed ? (
         <div className="absolute inset-0 bg-indigo-900 flex flex-col items-center justify-center z-10 transition-opacity duration-300">
            <span className="text-6xl mb-4">👆</span>
            <p className="text-xl font-bold uppercase tracking-widest">{t("tapToReveal")}</p>
            <p className="text-sm text-indigo-300 mt-2">({t("tapToRevealDesc")})</p>
         </div>
      ) : (
         <div className="animate-fadeIn">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">{t("yourRole")}</h3>
            <div data-testid="role-display" className="text-5xl font-black mb-8 tracking-wider">
              {isImpostor ? <span className="text-red-500 drop-shadow-md">IMPOSTOR</span> : <span className="text-blue-400 drop-shadow-md">CIVILIAN</span>}
            </div>
            
            <div className="border-t border-slate-700 pt-8">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-semibold">{t("yourSecretWord")}</h3>
              <div data-testid="secret-word-display" className="text-4xl font-mono bg-slate-900 inline-block px-8 py-4 rounded-lg border border-slate-700 shadow-inner">
                 {isImpostor ? <span className="tracking-widest">???</span> : turn.word}
              </div>
              {isImpostor ? (
                  <p className="mt-4 text-sm text-red-300 font-medium">{t("findOthers")}</p>
              ) : (
                  <p className="mt-4 text-sm text-blue-300 font-medium">{t("findImpostor")}</p>
              )}
            </div>
         </div>
      )}
    </div>
  );
}
