import fs from 'fs';
import path from 'path';

export interface ParsedMatch {
  numero: number;
  local: string;
  away: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  signo: string | null;
  fechaHora?: string;
}

export interface ParsedJornada {
  numero: number;
  fechaCierre: string;
  estado: 'FINALIZADA' | 'EN_JUEGO' | 'PROGRAMADA';
  partidos: ParsedMatch[];
}

export function parseSelaeDump(): ParsedJornada[] {
  const filePath = path.join(__dirname, 'selae-raw-2026.txt');
  const content = fs.readFileSync(filePath, 'utf8');

  const blocks = content.split(/\[La Quiniela Jornada /i);
  const result: ParsedJornada[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const headerMatch = b.match(/^(\d+)ª([^\]\n]+)/);
    if (!headerMatch) continue;

    const jNum = parseInt(headerMatch[1], 10);
    if (jNum < 1 || jNum > 16) continue;

    const rawDate = headerMatch[2];
    const dateMatch = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    let fecha = '2026-10-25T20:00:00.000Z';
    if (dateMatch) {
      fecha = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T20:00:00.000Z`;
    }

    // Parse matches 1 to 14 and P-15
    const matches: ParsedMatch[] = [];

    // Extract match lines
    // Pattern: 1. \n Local - Away \n score \n sign
    // Or for pending: 7. \n Sevilla (m) - Osasuna (m) \n 26/10/2026 \n 21:00
    // Or P-15 \n Local - Away \n score \n sign
    for (let mNum = 1; mNum <= 14; mNum++) {
      const matchRegex = new RegExp(
        `(?:^|\\n|\\))${mNum}\\.\\s*\\n([^\\n]+)\\n(?:(\\d+)\\s*-\\s*(\\d+)|(\\d{2}\\/\\d{2}\\/\\d{4})(?:\\s*\\n\\s*(\\d{2}:\\d{2}))?)(?:\\n([1X2]))?`,
        'm'
      );
      const m = b.match(matchRegex);
      if (m) {
        const teams = m[1].replace(/\s*\([mf]\)/gi, '').split(/\s*-\s*/);
        const local = teams[0]?.trim() || `Equipo Local ${mNum}`;
        const away = teams[1]?.trim() || `Equipo Visitante ${mNum}`;

        if (m[2] !== undefined && m[3] !== undefined) {
          matches.push({
            numero: mNum,
            local,
            away,
            golesLocal: parseInt(m[2], 10),
            golesVisitante: parseInt(m[3], 10),
            signo: m[6] || null
          });
        } else if (m[6]) {
          // Partido con fecha pero con signo definitivo (e.g. sorteo o finalizado sin goles explícitos)
          matches.push({
            numero: mNum,
            local,
            away,
            golesLocal: null,
            golesVisitante: null,
            signo: m[6]
          });
        } else {
          // Partido pendiente / en juego hoy
          matches.push({
            numero: mNum,
            local,
            away,
            golesLocal: null,
            golesVisitante: null,
            signo: null,
            fechaHora: `${m[4] || ''} ${m[5] || ''}`.trim()
          });
        }
      }
    }

    // Pleno al 15
    const p15Regex = /(?:^|\n)P-15\s*\n([^\n]+)\n([^\n]+)\n([^\n]+)/m;
    const p15Match = b.match(p15Regex);
    if (p15Match) {
      const teams = p15Match[1].replace(/\s*\([mf]\)/gi, '').split(/\s*-\s*/);
      const local = teams[0]?.trim() || 'Local P15';
      const away = teams[1]?.trim() || 'Visitante P15';
      const rawScore = p15Match[2].trim();
      const scoreParts = rawScore.match(/(\d+)\s*-\s*(\d+)/);
      const signoP15 = p15Match[3].trim();

      matches.push({
        numero: 15,
        local,
        away,
        golesLocal: scoreParts ? parseInt(scoreParts[1], 10) : null,
        golesVisitante: scoreParts ? parseInt(scoreParts[2], 10) : null,
        signo: signoP15 || null
      });
    }

    const hasPending = matches.some(m => !m.signo);
    result.push({
      numero: jNum,
      fechaCierre: fecha,
      estado: hasPending ? 'EN_JUEGO' : 'FINALIZADA',
      partidos: matches
    });
  }

  // Ordenar de 1 a 16
  return result.sort((a, b) => a.numero - b.numero);
}

// Quick self-test if executed directly
if (require.main === module) {
  const jornadas = parseSelaeDump();
  console.log(`Parsed ${jornadas.length} jornadas:`);
  for (const j of jornadas) {
    console.log(`Jornada ${j.numero} (${j.fechaCierre}) - ${j.estado}: ${j.partidos.length} partidos. P1: ${j.partidos[0]?.local} vs ${j.partidos[0]?.away} (${j.partidos[0]?.signo})`);
  }
}
