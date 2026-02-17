### /home/devuser/smart-home/src/app/game/[gameId]/page.tsx
```
1: ### /home/devuser/smart-home/src/app/game/[gameId]/page.tsx
2: ```
3: 1: "use client";
4: 2: 
5: 3: import { useEffect, useState } from "react";
6: 4: import { useParams, useRouter } from "next/navigation";
7: 5: import { QRCodeSVG } from 'qrcode.react';
8: 6: 
9: 7: type Player = {
10: 8:   id: string;
11: 9:   name: string;
12: 10: };
13: 11: 
14: 12: type TurnDetails = {
15: 13:   gameId: string;
16: 14:   status: "JOINING" | "STARTED" | "FINISHED";
17: 15:   players: Player[];
18: 16:   actualTurn: {
19: 17:     role: "CIVILIAN" | "IMPOSTOR" | null;
20: 18:     word: string | null;
21: 19:   } | null;
22: 20:   pastTurns: {
23: 21:     word: string;
24: 22:     impostors: string[];
25: 23:     civilians: string[];
26: 24:   }[];
27: 25: };
28: 26: 
29: 27: export default function GameRoom() {
30: 28:   const { gameId } = useParams<{ gameId: string }>();
31: 29:   const router = useRouter();
32: 30:   
33: 31:   const [game, setGame] = useState<TurnDetails | null>(null);
34: 32:   const [loading, setLoading] = useState(true);
35: 33:   const [error, setError] = useState("");
36: 34:   const [isAdmin, setIsAdmin] = useState(false);
37: 35:   const [playerId, setPlayerId] = useState<string | null>(null);
38: 36:   const [showHistory, setShowHistory] = useState(false);
39: 37:   const [showQR, setShowQR] = useState(false);
40: 38:   const [currentUrl, setCurrentUrl] = useState("");
41: 39: 
42: 40:   useEffect(() => {
43: 41:     if (typeof window !== "undefined") {
44: 42:       setCurrentUrl(window.location.href);
45: 43:     }
46: 44:   }, []);
47: 45:   
48: 46:   useEffect(() => {
49: 47:     // Check credentials
50: 48:     const adminPwd = localStorage.getItem(`impostor_admin_${gameId}`);
51: 49:     const pid = localStorage.getItem(`impostor_player_${gameId}`);
52: 50:     
53: 51:     if (adminPwd) setIsAdmin(true);
54: 52:     setPlayerId(pid);
55: 53: 
56: 54:     if (!pid) {
57: 55:        router.push(`/join/${gameId}`);
58: 56:        return;
59: 57:     }
60: 58: 
61: 59:     const fetchGame = async () => {
62: 60:       try {
63: 61:         // Use getTurnDetails for everyone
64: 62:         const url = `/api/getTurnDetails/${gameId}/${pid}`;
65: 63:         const res = await fetch(url);
66: 64:         
67: 65:         if (res.status === 404) {
68: 66:           setError("Spiel nicht gefunden");
69: 67:           return;
70: 68:         }
71: 69:         
72: 70:         if (res.ok) {
73: 71:            const data = await res.json();
74: 72:            setGame(data);
75: 73:            setError("");
76: 74:         } else {
77: 75:            setError("Fehler beim Laden des Spiels");
78: 76:         }
79: 77:       } catch (err) {
80: 78:         console.error("Polling error", err);
81: 79:       } finally {
82: 80:         setLoading(false);
83: 81:       }
84: 82:     };
85: 83: 
86: 84:     fetchGame();
87: 85:     const interval = setInterval(fetchGame, 2000); // Poll every 2s
88: 86: 
89: 87:     return () => clearInterval(interval);
90: 88:   }, [gameId, router]);
91: 89: 
92: 90:   const apiCall = async (endpoint: string) => {
93: 91:     if (!isAdmin) return;
94: 92:     const adminPwd = localStorage.getItem(`impostor_admin_${gameId}`);
95: 93:     await fetch(`/api/${endpoint}/${gameId}?adminPwd=${adminPwd}`, { method: "POST" });
96: 94:   };
97: 95: 
98: 96:   const startGame = () => apiCall("startGame");
99: 97:   const nextTurn = () => apiCall("nextTurn");
100: 98:   const finishGame = () => apiCall("finishGame");
101: 99: 
102: 100:   if (loading && !game) return <div className="p-10 text-center">Lade Spiel...</div>;
103: 101:   if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
104: 102:   if (!game) return <div className="p-10 text-center">Keine Daten</div>;
105: 103: 
106: 104:   return (
107: 105:     <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 relative min-h-[50vh]">
108: 106:       <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
109: 107:         <h1 className="text-2xl font-bold text-indigo-600">Raum: {gameId.substring(0,8)}...</h1>
110: 108:         <div className="flex gap-2 items-center flex-wrap justify-center">
111: 109:             <button 
112: 110:               onClick={() => setShowHistory(!showHistory)} 
113: 111:               className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors"
114: 112:             >
115: 113:                {showHistory ? "Verlauf verbergen" : "Verlauf anzeigen"}
116: 114:             </button>
117: 115:             <div className="text-sm font-mono bg-gray-100 p-2 rounded">
118: 116:               Status: <span className={game.status === 'STARTED' ? 'text-green-600' : 'text-blue-600'}>{game.status}</span>
119: 117:             </div>
120: 118:         </div>
121: 119:       </div>
122: 120: 
123: 121:       {/* HISTORY MODAL / SECTION */}
124: 122:       {showHistory && (
125: 123:          <div className="mb-6 bg-gray-50 p-4 rounded border animate-fadeIn">
126: 124:             <h3 className="font-bold mb-2">Vergangene Runden</h3>
127: 125:             {game.pastTurns.length === 0 ? <p className="text-gray-500 text-sm">Keine vergangenen Runden.</p> : (
128: 126:                <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
129: 127:                   {game.pastTurns.map((turn, idx) => (
130: 128:                      <li key={idx} className="border-b pb-2 last:border-0">
131: 129:                         <span className="font-semibold text-indigo-700">Runde {idx + 1}:</span> Wort: <strong>{turn.word}</strong>. 
132: 130:                         <br/>
133: 131:                         <span className="text-red-600">Impostor:</span> {turn.impostors.join(", ")}. 
134: 132:                         <span className="text-blue-600">Civilians:</span> {turn.civilians.join(", ")}.
135: 133:                      </li>
136: 134:                   ))}
137: 135:                </ul>
138: 136:             )}
139: 137:          </div>
140: 138:       )}
141: 139: 
142: 140:       {/* LOBBY */}
143: 141:       {game.status === 'JOINING' && (
144: 142:         <div className="text-center py-10">
145: 143:           <h2 className="text-xl mb-4">Warte auf Spieler...</h2>
146: 144:           <div className="flex flex-wrap gap-4 justify-center mb-8">
147: 145:             {game.players.map(p => (
148: 146:               <div key={p.id} className="bg-gray-50 px-6 py-3 rounded shadow-sm flex items-center justify-center border border-gray-200">
149: 147:                 <span className={p.id === playerId ? "font-bold text-indigo-600" : "text-gray-700"}>{p.name} {p.id === playerId ? "(Du)" : ""}</span>
150: 148:               </div>
151: 149:             ))}
152: 150:           </div>
153: 151:           
154: 152:           <div className="flex gap-4 justify-center flex-col sm:flex-row items-center">
155: 153:              <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
156: 154:                 Link kopieren
157: 155:              </button>
158: 156:              <button onClick={() => setShowQR(!showQR)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center justify-center transition-colors">
159: 157:                 QR Code {showQR ? "verbergen" : "anzeigen"}
160: 158:              </button>
161: 159:              {isAdmin && (
162: 160:                 <button 
163: 161:                   onClick={startGame}
164: 162:                   disabled={game.players.length < 3}
165: 163:                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
166: 164:                 >
167: 165:                   Spiel starten ({game.players.length}/3 min)
168: 166:                 </button>
169: 167:              )}
170: 168:           </div>
171: 169:           
172: 170:           {showQR && currentUrl && (
173: 171:              <div className="mt-6 flex justify-center animate-fadeIn p-4 bg-white rounded-lg border shadow-sm inline-block">
174: 172:                 <QRCodeSVG value={currentUrl} size={150} />
175: 173:                 <p className="mt-2 text-xs text-gray-500">Scanne mich zum Beitreten</p>
176: 174:              </div>
177: 175:           )}
178: 176: 
179: 177:            {isAdmin && game.players.length < 3 && <p className="text-sm text-gray-400 mt-2">Mindestens 3 Spieler benötigt.</p>}
180: 178:         </div>
181: 179:       )}
182: 180: 
183: 181:       {/* ACTIVE GAME */}
184: 182:       {(game.status === 'STARTED' || game.status === 'FINISHED') && (
185: 183:         <div>
186: 184:           <div className="mb-8">
187: 185:              <h2 className="text-xl font-bold mb-4 text-center">Aktuelle Runde</h2>
188: 186:              <CurrentTurnDisplay game={game} />
189: 187:           </div>
190: 188: 
191: 189:           {isAdmin && game.status !== 'FINISHED' && (
192: 190:             <div className="flex gap-4 border-t pt-6 justify-center">
193: 191:                <button onClick={nextTurn} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
194: 192:                  Nächste Runde
195: 193:                </button>
196: 194:                <button onClick={finishGame} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded shadow-lg transition-transform hover:scale-105">
197: 195:                  Spiel beenden
198: 196:                </button>
199: 197:             </div>
200: 198:           )}
201: 199:           
202: 200:            {game.status === 'FINISHED' && (
203: 201:               <div className="text-center py-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 mt-4 shadow-sm">
204: 202:                 <p className="text-lg font-bold">Das Spiel ist beendet.</p>
205: 203:                 <p className="mb-4">Hoffentlich hattet ihr Spaß!</p>
206: 204:                 <button onClick={() => router.push('/')} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors">Neues Spiel erstellen</button>
207: 205:               </div>
208: 206:            )}
209: 207:         </div>
210: 208:       )}
211: 209:     </div>
212: 210:   );
213: 211: }
214: 212: 
215: 213: function CurrentTurnDisplay({ game }: { game: TurnDetails }) {
216: 214:   if (!game.actualTurn) {
217: 215:       if (game.status === 'FINISHED') return <div className="text-gray-500 italic text-center">Spiel vorbei. Siehe Verlauf.</div>;
218: 216:       return <div className="text-gray-500 italic text-center animate-pulse">Warte auf Rundenstart...</div>;
219: 217:   }
220: 218: 
221: 219:   const { role, word } = game.actualTurn;
222: 220:   const isImpostor = role === 'IMPOSTOR';
223: 221: 
224: 222:   return (
225: 223:     <div className="bg-slate-800 text-white p-8 rounded-xl text-center shadow-2xl max-w-lg mx-auto transform transition-all">
226: 224:       <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">Deine Rolle</h3>
227: 225:       <div className="text-5xl font-black mb-8 tracking-wider">
228: 226:         {isImpostor ? <span className="text-red-500 drop-shadow-md">IMPOSTOR</span> : <span className="text-blue-400 drop-shadow-md">CIVILIAN</span>}
229: 227:       </div>
230: 228:       
231: 229:       <div className="border-t border-slate-700 pt-8">
232: 230:         <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-semibold">Dein Geheimwort</h3>
233: 231:         <div className="text-4xl font-mono bg-slate-900 inline-block px-8 py-4 rounded-lg border border-slate-700 shadow-inner">
234: 232:            {isImpostor ? <span className="tracking-widest">???</span> : word}
235: 233:         </div>
236: 234:         {isImpostor ? (
237: 235:             <p className="mt-4 text-sm text-red-300 font-medium">Versuche herauszufinden, was die anderen haben!</p>
238: 236:         ) : (
239: 237:             <p className="mt-4 text-sm text-blue-300 font-medium">Finde den Impostor!</p>
240: 238:         )}
241: 239:       </div>
242: 240:     </div>
243: 241:   );
244: 242: }
245: ```
```
