### /home/devuser/smart-home/src/app/game/[gameId]/page.tsx
```
1: "use client";
2: 
3: import { useEffect, useState } from "react";
4: import { useParams, useRouter } from "next/navigation";
5: import { QRCodeSVG } from 'qrcode.react';
6: 
7: type Player = {
8:   id: string;
9:   name: string;
10: };
11: 
12: type TurnDetails = {
13:   gameId: string;
14:   status: "JOINING" | "STARTED" | "FINISHED";
15:   players: Player[];
16:   actualTurn: {
17:     role: "CIVILIAN" | "IMPOSTOR" | null;
18:     word: string | null;
19:   } | null;
20:   pastTurns: {
21:     word: string;
22:     impostors: string[];
23:     civilians: string[];
24:   }[];
25: };
26: 
27: export default function GameRoom() {
28:   const { gameId } = useParams<{ gameId: string }>();
29:   const router = useRouter();
30:   
31:   const [game, setGame] = useState<TurnDetails | null>(null);
32:   const [loading, setLoading] = useState(true);
33:   const [error, setError] = useState("");
34:   const [isAdmin, setIsAdmin] = useState(false);
35:   const [playerId, setPlayerId] = useState<string | null>(null);
36:   const [showHistory, setShowHistory] = useState(false);
37:   const [showQR, setShowQR] = useState(false);
38:   const [currentUrl, setCurrentUrl] = useState("");
39: 
40:   useEffect(() => {
41:     if (typeof window !== "undefined") {
42:       setCurrentUrl(window.location.href);
43:     }
44:   }, []);
45:   
46:   useEffect(() => {
47:     // Check credentials
48:     const adminPwd = localStorage.getItem(`impostor_admin_${gameId}`);
49:     const pid = localStorage.getItem(`impostor_player_${gameId}`);
50:     
51:     if (adminPwd) setIsAdmin(true);
52:     setPlayerId(pid);
53: 
54:     if (!pid) {
55:        router.push(`/join/${gameId}`);
56:        return;
57:     }
58: 
59:     const fetchGame = async () => {
60:       try {
61:         // Use getTurnDetails for everyone
62:         const url = `/api/getTurnDetails/${gameId}/${pid}`;
63:         const res = await fetch(url);
64:         
65:         if (res.status === 404) {
66:           setError("Spiel nicht gefunden");
67:           return;
68:         }
69:         
70:         if (res.ok) {
71:            const data = await res.json();
72:            setGame(data);
73:            setError("");
74:         } else {
75:            setError("Fehler beim Laden des Spiels");
76:         }
77:       } catch (err) {
78:         console.error("Polling error", err);
79:       } finally {
80:         setLoading(false);
81:       }
82:     };
83: 
84:     fetchGame();
85:     const interval = setInterval(fetchGame, 2000); // Poll every 2s
86: 
87:     return () => clearInterval(interval);
88:   }, [gameId, router]);
89: 
90:   const apiCall = async (endpoint: string) => {
91:     if (!isAdmin) return;
92:     const adminPwd = localStorage.getItem(`impostor_admin_${gameId}`);
93:     await fetch(`/api/${endpoint}/${gameId}?adminPwd=${adminPwd}`, { method: "POST" });
94:   };
95: 
96:   const startGame = () => apiCall("startGame");
97:   const nextTurn = () => apiCall("nextTurn");
98:   const finishGame = () => apiCall("finishGame");
99: 
100:   if (loading && !game) return <div className="p-10 text-center">Lade Spiel...</div>;
101:   if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
102:   if (!game) return <div className="p-10 text-center">Keine Daten</div>;
103: 
104:   return (
105:     <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 relative min-h-[50vh]">
106:       <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
107:         <h1 className="text-2xl font-bold text-indigo-600">Raum: {gameId.substring(0,8)}...</h1>
108:         <div className="flex gap-2 items-center flex-wrap justify-center">
109:             <button 
110:               onClick={() => setShowHistory(!showHistory)} 
111:               className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors"
112:             >
113:                {showHistory ? "Verlauf verbergen" : "Verlauf anzeigen"}
114:             </button>
115:             <div className="text-sm font-mono bg-gray-100 p-2 rounded">
116:               Status: <span className={game.status === 'STARTED' ? 'text-green-600' : 'text-blue-600'}>{game.status}</span>
117:             </div>
118:         </div>
119:       </div>
120: 
121:       {/* HISTORY MODAL / SECTION */}
122:       {showHistory && (
123:          <div className="mb-6 bg-gray-50 p-4 rounded border animate-fadeIn">
124:             <h3 className="font-bold mb-2">Vergangene Runden</h3>
125:             {game.pastTurns.length === 0 ? <p className="text-gray-500 text-sm">Keine vergangenen Runden.</p> : (
126:                <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
127:                   {game.pastTurns.map((turn, idx) => (
128:                      <li key={idx} className="border-b pb-2 last:border-0">
129:                         <span className="font-semibold text-indigo-700">Runde {idx + 1}:</span> Wort: <strong>{turn.word}</strong>. 
130:                         <br/>
131:                         <span className="text-red-600">Impostor:</span> {turn.impostors.join(", ")}. 
132:                         <span className="text-blue-600">Civilians:</span> {turn.civilians.join(", ")}.
133:                      </li>
134:                   ))}
135:                </ul>
136:             )}
137:          </div>
138:       )}
139: 
140:       {/* LOBBY */}
141:       {game.status === 'JOINING' && (
142:         <div className="text-center py-10">
143:           <h2 className="text-xl mb-4">Warte auf Spieler...</h2>
144:           <div className="flex flex-wrap gap-4 justify-center mb-8">
145:             {game.players.map(p => (
146:               <div key={p.id} className="bg-gray-50 px-6 py-3 rounded shadow-sm flex items-center justify-center border border-gray-200">
147:                 <span className={p.id === playerId ? "font-bold text-indigo-600" : "text-gray-700"}>{p.name} {p.id === playerId ? "(Du)" : ""}</span>
148:               </div>
149:             ))}
150:           </div>
151:           
152:           <div className="flex gap-4 justify-center flex-col sm:flex-row items-center">
153:              <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
154:                 Link kopieren
155:              </button>
156:              <button onClick={() => setShowQR(!showQR)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
157:                 QR Code {showQR ? "verbergen" : "anzeigen"}
158:              </button>
159:              {isAdmin && (
160:                 <button 
161:                   onClick={startGame}
162:                   disabled={game.players.length < 3}
163:                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
164:                 >
165:                   Spiel starten ({game.players.length}/3 min)
166:                 </button>
167:              )}
168:           </div>
169:           
170:           {showQR && currentUrl && (
171:              <div className="mt-6 flex justify-center animate-fadeIn p-4 bg-white rounded-lg border shadow-sm inline-block">
172:                 <QRCodeSVG value={currentUrl} size={150} />
173:                 <p className="mt-2 text-xs text-gray-500">Scanne mich zum Beitreten</p>
174:              </div>
175:           )}
176: 
177:            {isAdmin && game.players.length < 3 && <p className="text-sm text-gray-400 mt-2">Mindestens 3 Spieler benötigt.</p>}
178:         </div>
179:       )}
180: 
181:       {/* ACTIVE GAME */}
182:       {(game.status === 'STARTED' || game.status === 'FINISHED') && (
183:         <div>
184:           <div className="mb-8">
185:              <h2 className="text-xl font-bold mb-4 text-center">Aktuelle Runde</h2>
186:              <CurrentTurnDisplay game={game} />
187:           </div>
188: 
189:           {isAdmin && game.status !== 'FINISHED' && (
190:             <div className="flex gap-4 border-t pt-6 justify-center">
191:                <button onClick={nextTurn} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
192:                  Nächste Runde
193:                </button>
194:                <button onClick={finishGame} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
195:                  Spiel beenden
196:                </button>
197:             </div>
198:           )}
199:           
200:            {game.status === 'FINISHED' && (
201:               <div className="text-center py-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 mt-4 shadow-sm">
202:                 <p className="text-lg font-bold">Das Spiel ist beendet.</p>
203:                 <p className="mb-4">Hoffentlich hattet ihr Spaß!</p>
204:                 <button onClick={() => router.push('/')} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">Neues Spiel erstellen</button>
205:               </div>
206:            )}
207:         </div>
208:       )}
209:     </div>
210:   );
211: }
212: 
213: function CurrentTurnDisplay({ game }: { game: TurnDetails }) {
214:   if (!game.actualTurn) {
215:       if (game.status === 'FINISHED') return <div className="text-gray-500 italic text-center">Spiel vorbei. Siehe Verlauf.</div>;
216:       return <div className="text-gray-500 italic text-center animate-pulse">Warte auf Rundenstart...</div>;
217:   }
218: 
219:   const { role, word } = game.actualTurn;
220:   const isImpostor = role === 'IMPOSTOR';
221: 
222:   return (
223:     <div className="bg-slate-800 text-white p-8 rounded-xl text-center shadow-2xl max-w-lg mx-auto transform transition-all">
224:       <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">Deine Rolle</h3>
225:       <div className="text-5xl font-black mb-8 tracking-wider">
226:         {isImpostor ? <span className="text-red-500 drop-shadow-md">IMPOSTOR</span> : <span className="text-blue-400 drop-shadow-md">CIVILIAN</span>}
227:       </div>
228:       
229:       <div className="border-t border-slate-700 pt-8">
230:         <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-semibold">Dein Geheimwort</h3>
231:         <div className="text-4xl font-mono bg-slate-900 inline-block px-8 py-4 rounded-lg border border-slate-700 shadow-inner">
232:            {isImpostor ? <span className="tracking-widest">???</span> : word}
233:         </div>
234:         {isImpostor ? (
235:             <p className="mt-4 text-sm text-red-300 font-medium">Versuche herauszufinden, was die anderen haben!</p>
236:         ) : (
237:             <p className="mt-4 text-sm text-blue-300 font-medium">Finde den Impostor!</p>
238:         )}
239:       </div>
240:     </div>
241:   );
242: }
```
