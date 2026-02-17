
import { WordGenerator } from '@/domain/ports/WordGenerator';

export class GeminiWordGenerator implements WordGenerator {
  private apiKey: string;
  private model: string = 'gemini-flash-lite-latest'; 
  private categories = [
        "Küchengeräte (Elektrisch)", "Werkzeug für Holzarbeiten", "Gartengeräte",
        "Büroartikel & Schreibwaren", "Camping-Ausrüstung", "Musikinstrumente",
        "Badezimmer-Utensilien", "Sport-Equipment", "Backstube & Gebäck",
        "Elektronik-Gadgets", "Spielzeug aus dem Kinderzimmer", "Winterbekleidung",
        "Sommer-Accessoires", "Kopfbedeckungen", "Schuhschrank-Inhalt",
        "Berufsbekleidung & Uniformen", "Grillparty-Zubehör", "Strandurlaub-Ausrüstung",
        "Wandern & Bergsport", "Fahrrad-Komponenten", "Haustier-Bedarf",
        "Bauernhof-Inventar", "Waldtiere Mitteleuropas", "Exotische Vögel",
        "Meeresbewohner", "Astronomie & Weltraum", "Transportmittel (Land)",
        "Zirkus & Jahrmarkt", "Kino & Film-Equipment", "Flughafen & Fliegen",
        "Schifffahrt & Nautik", "Post & Versand-Artikel", "Hotelzimmer-Inventar",
        "Frühstückstisch", "Italienische Küche", "Asiatische Spezialitäten",
        "Gewürze & Kräuter", "Exotisches Obst", "Gemüsegarten", "Kaffeebar & Heißgetränke",
        "Museum & Kunstgegenstände", "Reinigungsmittel & Putzzeug", "Erste Hilfe & Medizin",
        "Mittelalter & Rittertum", "Wilder Westen", "Detektiv-Ausrüstung",
        "Fotografie-Zubehör", "Malerbedarf & Basteln", "Zimmerpflanzen",
        "Haushaltsgroßgeräte", "Lampen & Leuchtmittel", "Taschen & Rucksäcke",
        "Uhren & Zeitmessung", "Schmuck & Accessoires", "Haarpflege & Friseur",
        "Fitnessstudio-Geräte", "Wintersport-Ausrüstung", "Wassersport",
        "Brett- & Kartenspiele", "Nähzimmer-Bedarf", "Baustellen-Fahrzeuge",
        "Tankstellen-Zubehör", "Arztpraxis-Einrichtung", "Camping-Küche",
        "Bäckerei-Produkte", "Verpackungsmaterial", "Heimwerker-Bedarf",
        "Angelsport", "Optik & Sehhilfen", "Souvenirs", "Schulmaterial",
        "Festivals & Konzerte", "Picknick im Grünen", "Waschküche",
        "Gartenmöbel", "Automobil-Innenraum", "Feuerwehr-Ausrüstung",
        "Polizei-Einsatzmittel", "Wellness & Spa", "Jahrmarkt-Süßigkeiten"
    ];

    constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    if (!this.apiKey) {
      console.warn("GOOGLE_API_KEY not set");
    }
  }

  async generateWord(age: number, language: string, previousWords: string[]): Promise<string> {
    if (!this.apiKey) return "fallback-word";
      const randomCategory = this.categories[Math.floor(Math.random() * this.categories.length)];
      // Use the provided language or default to de-DE
      console.log("Random category: ", randomCategory);
      const targetLanguage = language || 'de-DE';
      const prompt = `
        Aufgabe: Wähle ein einzelnes, geheimes Wort für das "Impostor"-Spiel (Variante: Mr. White).
        
        Parameter:
        - Zielgruppe: Alter ${age}
        - Sprache: ${targetLanguage}
        - Kategorie: ${randomCategory}
        - Ignoriere diese Wörter (bereits verwendet): ${previousWords.join(', ')}
        
        Regeln für die Auswahl (WICHTIG!):
        1. Wähle zuerst eine zufällige, spezifische Kategorie.
        2. Das Wort muss in der Sprache ${targetLanguage} geliefert werden.
        3. Konkretisierung: Wähle ausschließlich KONKRETE SUBSTANTIVE. Keine Verben (wie "laufen", "quaken") und keine abstrakten Begriffe (wie "Liebe", "Mut").
        4. Regeln:
            - Die Wörter sollten thematisch und von der Schwierigkeit zum Alter ${age} passen. 
            - Hab für die Kategorie mindestens 100 Wörter bereit zur random Auswahl.
            - Wörter sollte idR jeder in dem Alter kennen, aber reduziere die Wahrscheinlichkeit, zu typische Wörter vom Alltag zu nehmen (Haus, Katze, usw), bei so einfachen Wörtern dann eher zusammengesetzte Wörter nehmen (Schäferhund z.B.)
        5. Das Wort darf nicht in der Liste der bereits verwendeten Wörter stehen und sollte auch thematisch nicht zu nah an diesen liegen.
        6. Das Wort muss für eine Person im Alter von ${age} Jahren leicht verständlich und bildlich vorstellbar sein.
        
        Antworte ausschließlich im JSON-Format:
        {
          "category": "Name der Kategorie",
          "word": "Das geheime Wort"
        }
        `.trim();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        console.error(`Gemini API error with model ${this.model}: ${response.statusText}`);
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        return json.word;
      }
      
      return "apple";
    } catch (error) {
      console.error("Error generating word:", error);
      return "banana";
    }
  }
}
