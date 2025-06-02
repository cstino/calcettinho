import { NextRequest, NextResponse } from 'next/server';
import { getPlayers } from '@/utils/airtable';

export async function GET(req: NextRequest) {
  try {
    // Recupera la lista dei giocatori reali da Airtable
    const players = await getPlayers();
    
    if (players.length === 0) {
      return new Response('⚠️ Nessun giocatore trovato in Airtable', { 
        headers: { 'Content-Type': 'text/plain' } 
      });
    }

    // Usa il primo giocatore disponibile per i test
    const testPlayer = players[0];
    console.log(`🧪 Test player selezionato: ${testPlayer.nome} (${testPlayer.email})`);

    // Lista di tutti i template speciali disponibili
    const testCombinations = [
      {
        template: '1presenza',
        name: 'Prima Presenza',
        description: 'Prima partita giocata',
        color: '🟡 Oro scuro',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=1presenza`
      },
      {
        template: 'goleador',
        name: 'Goleador',
        description: 'Più gol segnati in partita',
        color: '🔴 Rosso',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=goleador`
      },
      {
        template: 'assistman',
        name: 'Assist Man',
        description: 'Più assist forniti in partita',
        color: '🔵 Blu',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=assistman`
      },
      {
        template: 'motm',
        name: 'Man of the Match',
        description: 'Più UP ricevuti in partita',
        color: '🟣 Viola',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=motm`
      },
      {
        template: 'win3',
        name: 'Streak Winner 3',
        description: '3 vittorie consecutive',
        color: '🟢 Verde',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=win3`
      },
      {
        template: 'win5',
        name: 'Streak Winner 5',
        description: '5 vittorie consecutive',
        color: '🟠 Arancione',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=win5`
      },
      {
        template: 'win10',
        name: 'Streak Winner 10',
        description: '10 vittorie consecutive',
        color: '⚫ Nero/Oro',
        testUrl: `http://localhost:3001/api/card-special/${encodeURIComponent(testPlayer.email)}?template=win10`
      }
    ];

    // Calcola overall del giocatore test
    const stats = [testPlayer.ATT, testPlayer.DEF, testPlayer.VEL, testPlayer.FOR, testPlayer.PAS, testPlayer.POR];
    // Calcola overall come media delle 5 migliori statistiche
    const top5Stats = stats.sort((a, b) => b - a).slice(0, 5);
    const overall = Math.round(top5Stats.reduce((a, b) => a + b, 0) / 5);

    // Genera HTML per visualizzare tutte le card speciali
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>🎯 Test Card Speciali - Calcettinho</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #1a1a1a; 
            color: #fff; 
            padding: 20px; 
            margin: 0;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { text-align: center; color: #FFD700; margin-bottom: 30px; }
          .cards-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 30px; 
            margin: 30px 0;
          }
          .card-test { 
            background: #2a2a2a; 
            border: 2px solid #444; 
            border-radius: 12px; 
            padding: 20px; 
            text-align: center;
            transition: transform 0.3s ease;
          }
          .card-test:hover { 
            transform: scale(1.02); 
            border-color: #FFD700;
          }
          .card-image { 
            width: 100%; 
            max-width: 300px; 
            height: auto; 
            border-radius: 8px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            margin: 15px 0;
          }
          .card-title { 
            color: #FFD700; 
            font-size: 1.3em; 
            font-weight: bold; 
            margin: 10px 0;
          }
          .card-description { 
            color: #ccc; 
            margin: 8px 0;
          }
          .card-color { 
            color: #aaa; 
            font-size: 0.9em;
            margin: 5px 0;
          }
          .analysis-info {
            background: #333;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #FFD700;
          }
          .test-link {
            display: inline-block;
            margin: 10px 0;
            padding: 8px 16px;
            background: #FFD700;
            color: #000;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            transition: background 0.3s ease;
          }
          .test-link:hover {
            background: #FFA500;
          }
          .player-info {
            background: #2d4a22;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #4ade80;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎯 Test Card Speciali - Sistema Colori Automatico</h1>
          
          <div class="player-info">
            <h3>🎮 Giocatore Test dal Database</h3>
            <p><strong>Nome:</strong> ${testPlayer.nome}</p>
            <p><strong>Email:</strong> ${testPlayer.email}</p>
            <p><strong>Overall:</strong> ${overall}</p>
            <p><strong>Stats:</strong> ATT ${testPlayer.ATT} | DEF ${testPlayer.DEF} | VEL ${testPlayer.VEL} | FOR ${testPlayer.FOR} | PAS ${testPlayer.PAS} | POR ${testPlayer.POR}</p>
          </div>
          
          <div class="analysis-info">
            <h3>🧪 Sistema di Test Automatico</h3>
            <p><strong>Analisi Luminosità:</strong> Ogni card special viene analizzata automaticamente per determinare i colori ottimali del testo.</p>
            <p><strong>Colori Dinamici:</strong></p>
            <ul>
              <li><strong>Sfondo Chiaro:</strong> Testo grigio scuro (#2B2B2B) + Valori rosso scuro (#8B0000)</li>
              <li><strong>Sfondo Scuro:</strong> Testo bianco (#FFFFFF) + Valori oro (#FFD700)</li>
            </ul>
          </div>

          <div class="cards-grid">
            ${testCombinations.map(card => `
              <div class="card-test">
                <div class="card-title">${card.name}</div>
                <div class="card-description">${card.description}</div>
                <div class="card-color">Sfondo: ${card.color}</div>
                <img src="${card.testUrl}" alt="${card.name}" class="card-image" />
                <br>
                <a href="${card.testUrl}" target="_blank" class="test-link">
                  Apri Card ${card.template.toUpperCase()}
                </a>
              </div>
            `).join('')}
          </div>

          <div class="analysis-info">
            <h3>📊 Come Testare</h3>
            <p>1. <strong>Osserva i colori:</strong> Controlla che testi e valori siano ben leggibili su ogni sfondo</p>
            <p>2. <strong>Controlla i log:</strong> Nel terminale vedrai l'analisi luminosità in tempo reale</p>
            <p>3. <strong>Confronta template:</strong> Ogni card dovrebbe adattarsi automaticamente al suo sfondo</p>
            <p>4. <strong>Test responsive:</strong> Le card dovrebbero mantenere la leggibilità su tutti i template</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error) {
    console.error('Errore nel recupero giocatori per test:', error);
    return new Response(`❌ Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, { 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
} 