/**
 * Servicio de Inteligencia Táctica, Alineaciones y Estado de Jugadores (Squad & Lineups Service).
 * Proporciona información detallada sobre onces iniciales, sistemas tácticos, bajas médicas,
 * sanciones y el impacto matemático ponderado sobre el potencial ofensivo y defensivo de los equipos.
 */

export type PosicionJugador = 'POR' | 'DEF' | 'MED' | 'DEL';

export interface Jugador {
  nombre: string;
  dorsal: number;
  posicion: PosicionJugador;
  esClave?: boolean;
  esCapitan?: boolean;
}

export type TipoIncidencia = 'LESION' | 'SANCION' | 'DUDA' | 'ROTACION';
export type GravedadIncidencia = 'CRITICA' | 'MODERADA' | 'LEVE';

export interface BajaJugador {
  jugador: string;
  posicion: PosicionJugador;
  tipo: TipoIncidencia;
  motivo: string;
  gravedad: GravedadIncidencia;
  esClave: boolean;
  tiempoEstimado?: string;
}

export interface ImpactoPlantilla {
  nivelAlerta: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  resumen: string;
  factorOfensivo: number;  // Multiplicador sobre lambda (ej. 0.88 = -12% gol por bajas ofensivas)
  factorDefensivo: number; // Multiplicador sobre mu (ej. 1.10 = +10% vulnerabilidad defensiva)
  bajasClaveCount: number;
}

export interface AlineacionEquipo {
  equipo: string;
  sistema: string; // "4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "5-3-2"
  estado: 'CONFIRMADA' | 'PROBABLE';
  entrenador: string;
  titulares: Jugador[];
  suplentesDestacados: string[];
  bajas: BajaJugador[];
  impacto: ImpactoPlantilla;
}

export interface MatchSquadReport {
  local: AlineacionEquipo;
  visitante: AlineacionEquipo;
  resumenTactico: string;
  ventajaPlantilla: 'LOCAL' | 'VISITANTE' | 'EQUILIBRADO';
}

// ============================================================================
// BASE DE CONOCIMIENTO TÁCTICA Y DE PLANTILLAS CANÓNICAS
// ============================================================================

interface TeamTacticalProfile {
  sistema: string;
  entrenador: string;
  titulares: Jugador[];
  suplentes: string[];
  bajasHabituales: BajaJugador[];
}

const CANONICAL_TEAMS: Record<string, TeamTacticalProfile> = {
  'Real Madrid': {
    sistema: '4-3-3',
    entrenador: 'Carlo Ancelotti',
    titulares: [
      { nombre: 'Thibaut Courtois', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Trent Alexander-Arnold', dorsal: 12, posicion: 'DEF', esClave: true },
      { nombre: 'Éder Militão', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Antonio Rüdiger', dorsal: 22, posicion: 'DEF', esClave: true },
      { nombre: 'Ferland Mendy', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Federico Valverde', dorsal: 8, posicion: 'MED', esClave: true, esCapitan: true },
      { nombre: 'Aurélien Tchouaméni', dorsal: 14, posicion: 'MED' },
      { nombre: 'Jude Bellingham', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Rodrygo Goes', dorsal: 11, posicion: 'DEL' },
      { nombre: 'Kylian Mbappé', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Vinícius Jr.', dorsal: 7, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Lunin', 'Raúl Asencio', 'Dean Huijsen', 'Marc Cucurella', 'Eduardo Camavinga', 'Arda Güler', 'Endrick', 'Brahim Díaz'],
    bajasHabituales: [
      { jugador: 'David Alaba', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular en el sóleo', gravedad: 'LEVE', esClave: false, tiempoEstimado: 'Duda de última hora' }
    ]
  },
  'Barcelona': {
    sistema: '4-2-3-1',
    entrenador: 'Hansi Flick',
    titulares: [
      { nombre: 'Joan Garcia', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Jules Koundé', dorsal: 23, posicion: 'DEF', esClave: true },
      { nombre: 'Pau Cubarsí', dorsal: 5, posicion: 'DEF', esClave: true },
      { nombre: 'Eric Garcia', dorsal: 24, posicion: 'DEF' },
      { nombre: 'Alejandro Balde', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Frenkie de Jong', dorsal: 21, posicion: 'MED' },
      { nombre: 'Pedri González', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Lamine Yamal', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Dani Olmo', dorsal: 20, posicion: 'MED', esClave: true },
      { nombre: 'Raphinha Belloli', dorsal: 11, posicion: 'DEL', esClave: true, esCapitan: true },
      { nombre: 'Gabriel Jesus', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Szczęsny', 'João Cancelo', 'Andreas Christensen', 'Gavi', 'Fermín López', 'Marc Bernal', 'Karim Adeyemi', 'Anthony Gordon'],
    bajasHabituales: [
      { jugador: 'Andreas Christensen', posicion: 'DEF', tipo: 'DUDA', motivo: 'Molestias en el tendón de Aquiles', gravedad: 'LEVE', esClave: false, tiempoEstimado: 'Pendiente de evolución' },
      { jugador: 'Marc Bernal', posicion: 'MED', tipo: 'ROTACION', motivo: 'Reincorporación progresiva', gravedad: 'LEVE', esClave: false }
    ]
  },
  'At. Madrid': {
    sistema: '4-4-2',
    entrenador: 'Diego Pablo Simeone',
    titulares: [
      { nombre: 'Jan Oblak', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Marcos Llorente', dorsal: 14, posicion: 'DEF', esClave: true },
      { nombre: 'Robin Le Normand', dorsal: 24, posicion: 'DEF' },
      { nombre: 'Cristian Romero', dorsal: 4, posicion: 'DEF', esClave: true },
      { nombre: 'Dávid Hancko', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Morten Hjulmand', dorsal: 16, posicion: 'MED', esClave: true },
      { nombre: 'Koke Resurrección', dorsal: 6, posicion: 'MED', esCapitan: true },
      { nombre: 'Pablo Barrios', dorsal: 8, posicion: 'MED' },
      { nombre: 'Alex Baena', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Julián Álvarez', dorsal: 19, posicion: 'DEL', esClave: true },
      { nombre: 'Alexander Sørloth', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Musso', 'Giménez', 'Grimaldo', 'Johnny Cardoso', 'Kang-In Lee', 'Ademola Lookman', 'Jonathan David', 'Giuliano Simeone'],
    bajasHabituales: [
      { jugador: 'José María Giménez', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: true, tiempoEstimado: 'Duda de última hora' }
    ]
  },
  'Athletic Club': {
    sistema: '4-2-3-1',
    entrenador: 'Ernesto Valverde',
    titulares: [
      { nombre: 'Julen Agirrezabala', dorsal: 13, posicion: 'POR' },
      { nombre: 'Óscar de Marcos', dorsal: 18, posicion: 'DEF', esCapitan: true },
      { nombre: 'Dani Vivian', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Aitor Paredes', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Yuri Berchiche', dorsal: 17, posicion: 'DEF' },
      { nombre: 'Iñigo Ruiz de Galarreta', dorsal: 16, posicion: 'MED', esClave: true },
      { nombre: 'Mikel Jauregizar', dorsal: 23, posicion: 'MED' },
      { nombre: 'Iñaki Williams', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Oihan Sancet', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Nico Williams', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Gorka Guruzeta', dorsal: 12, posicion: 'DEL' }
    ],
    suplentes: ['Padilla', 'Gorosabel', 'Yeray Álvarez', 'Unai Gómez', 'Ander Herrera', 'Álex Berenguer', 'Álvaro Djaló'],
    bajasHabituales: [
      { jugador: 'Unai Simón', posicion: 'POR', tipo: 'LESION', motivo: 'Operación ligamentos muñeca', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja médica' }
    ]
  },
  'Real Sociedad': {
    sistema: '4-3-3',
    entrenador: 'Imanol Alguacil',
    titulares: [
      { nombre: 'Álex Remiro', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Jon Aramburu', dorsal: 27, posicion: 'DEF' },
      { nombre: 'Igor Zubeldia', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Nayef Aguerd', dorsal: 21, posicion: 'DEF', esClave: true },
      { nombre: 'Sergio Gómez', dorsal: 17, posicion: 'DEF' },
      { nombre: 'Martín Zubimendi', dorsal: 4, posicion: 'MED', esClave: true },
      { nombre: 'Luka Sučić', dorsal: 24, posicion: 'MED' },
      { nombre: 'Brais Méndez', dorsal: 23, posicion: 'MED', esClave: true },
      { nombre: 'Takefusa Kubo', dorsal: 14, posicion: 'DEL', esClave: true },
      { nombre: 'Mikel Oyarzabal', dorsal: 10, posicion: 'DEL', esCapitan: true, esClave: true },
      { nombre: 'Ander Barrenetxea', dorsal: 7, posicion: 'DEL' }
    ],
    suplentes: ['Marrero', 'Aritz Elustondo', 'Javi López', 'Beñat Turrientes', 'Pablo Marín', 'Sheraldo Becker', 'Orri Óskarsson'],
    bajasHabituales: [
      { jugador: 'Hamari Traoré', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado', gravedad: 'MODERADA', esClave: true },
      { jugador: 'Arsen Zakharyan', posicion: 'MED', tipo: 'LESION', motivo: 'Tendón peroneo tobillo', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Betis': {
    sistema: '4-2-3-1',
    entrenador: 'Manuel Pellegrini',
    titulares: [
      { nombre: 'Rui Silva', dorsal: 1, posicion: 'POR' },
      { nombre: 'Héctor Bellerín', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Marc Bartra', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Diego Llorente', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Romain Perraud', dorsal: 15, posicion: 'DEF' },
      { nombre: 'Johnny Cardoso', dorsal: 4, posicion: 'MED', esClave: true },
      { nombre: 'Sergi Altimira', dorsal: 16, posicion: 'MED' },
      { nombre: 'Pablo Fornals', dorsal: 18, posicion: 'MED', esClave: true },
      { nombre: 'Giovani Lo Celso', dorsal: 20, posicion: 'MED', esClave: true },
      { nombre: 'Ez Abde', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Vitor Roque', dorsal: 8, posicion: 'DEL' }
    ],
    suplentes: ['Adrián San Miguel', 'Natan', 'Ricardo Rodríguez', 'Aitor Ruibal', 'Assane Diao', 'Chimy Ávila', 'Bakambu'],
    bajasHabituales: [
      { jugador: 'Isco Alarcón', posicion: 'MED', tipo: 'LESION', motivo: 'Fisura peroné izquierdo', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja de larga duración' },
      { jugador: 'William Carvalho', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura tendón de Aquiles', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Villarreal': {
    sistema: '4-4-2',
    entrenador: 'Marcelino García Toral',
    titulares: [
      { nombre: 'Diego Conde', dorsal: 13, posicion: 'POR' },
      { nombre: 'Kiko Femenía', dorsal: 17, posicion: 'DEF' },
      { nombre: 'Raúl Albiol', dorsal: 3, posicion: 'DEF', esCapitan: true },
      { nombre: 'Logan Costa', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Sergi Cardona', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Yeremy Pino', dorsal: 21, posicion: 'MED' },
      { nombre: 'Dani Parejo', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Santi Comesaña', dorsal: 14, posicion: 'MED' },
      { nombre: 'Álex Baena', dorsal: 16, posicion: 'MED', esClave: true },
      { nombre: 'Ayoze Pérez', dorsal: 22, posicion: 'DEL', esClave: true },
      { nombre: 'Thierno Barry', dorsal: 15, posicion: 'DEL' }
    ],
    suplentes: ['Luiz Júnior', 'Willy Kambwala', 'Eric Bailly', 'Pape Gueye', 'Denis Suárez', 'Ilias Akhomach', 'Nicolas Pépé'],
    bajasHabituales: [
      { jugador: 'Gerard Moreno', posicion: 'DEL', tipo: 'LESION', motivo: 'Lesión en el isquiotibial', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Duda constante' },
      { jugador: 'Juan Foyth', posicion: 'DEF', tipo: 'LESION', motivo: 'Esguince ligamento rodilla', gravedad: 'MODERADA', esClave: true }
    ]
  },
  'Sevilla': {
    sistema: '4-3-3',
    entrenador: 'Francisco Javier García Pimienta',
    titulares: [
      { nombre: 'Örjan Nyland', dorsal: 13, posicion: 'POR' },
      { nombre: 'José Ángel Carmona', dorsal: 32, posicion: 'DEF' },
      { nombre: 'Loïc Badé', dorsal: 22, posicion: 'DEF', esClave: true },
      { nombre: 'Nemanja Gudelj', dorsal: 6, posicion: 'DEF', esCapitan: true },
      { nombre: 'Adrià Pedrosa', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Albert Sambi Lokonga', dorsal: 12, posicion: 'MED' },
      { nombre: 'Nemanja Gudelj', dorsal: 6, posicion: 'MED' },
      { nombre: 'Djibril Sow', dorsal: 20, posicion: 'MED' },
      { nombre: 'Dodi Lukébakio', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Isaac Romero', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Chidera Ejuke', dorsal: 21, posicion: 'DEL' }
    ],
    suplentes: ['Álvaro Fernández', 'Marcao', 'Kike Salas', 'Juanlu Sánchez', 'Pedro Ortiz', 'Peque Fernández', 'Kelechi Iheanacho'],
    bajasHabituales: [
      { jugador: 'Saúl Ñíguez', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura muscular bíceps femoral', gravedad: 'MODERADA', esClave: true, tiempoEstimado: '2 meses' },
      { jugador: 'Suso Fernández', posicion: 'DEL', tipo: 'DUDA', motivo: 'Sobrecarga en el aductor', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Osasuna': {
    sistema: '4-3-3',
    entrenador: 'Vicente Moreno',
    titulares: [
      { nombre: 'Sergio Herrera', dorsal: 1, posicion: 'POR', esClave: true, esCapitan: true },
      { nombre: 'Jesús Areso', dorsal: 12, posicion: 'DEF' },
      { nombre: 'Alejandro Catena', dorsal: 24, posicion: 'DEF' },
      { nombre: 'Flavien Boyomo', dorsal: 22, posicion: 'DEF', esClave: true },
      { nombre: 'Abel Bretones', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Lucas Torró', dorsal: 6, posicion: 'MED' },
      { nombre: 'Jon Moncayola', dorsal: 7, posicion: 'MED' },
      { nombre: 'Aimar Oroz', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Rubén Peña', dorsal: 15, posicion: 'DEL' },
      { nombre: 'Ante Budimir', dorsal: 17, posicion: 'DEL', esClave: true },
      { nombre: 'Bryan Zaragoza', dorsal: 19, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Aitor Fernández', 'Unai García', 'Herrando', 'Pablo Ibáñez', 'Moi Gómez', 'Kike Barja', 'Raúl García de Haro'],
    bajasHabituales: [
      { jugador: 'José Arnaiz', posicion: 'DEL', tipo: 'DUDA', motivo: 'Molestias musculares', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Celta': {
    sistema: '3-4-2-1',
    entrenador: 'Claudio Giráldez',
    titulares: [
      { nombre: 'Vicente Guaita', dorsal: 13, posicion: 'POR' },
      { nombre: 'Javi Rodríguez', dorsal: 32, posicion: 'DEF' },
      { nombre: 'Carl Starfelt', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Marcos Alonso', dorsal: 20, posicion: 'DEF', esClave: true },
      { nombre: 'Óscar Mingueza', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Fran Beltrán', dorsal: 8, posicion: 'MED' },
      { nombre: 'Hugo Sotelo', dorsal: 22, posicion: 'MED' },
      { nombre: 'Hugo Álvarez', dorsal: 33, posicion: 'DEF' },
      { nombre: 'Iago Aspas', dorsal: 10, posicion: 'DEL', esCapitan: true, esClave: true },
      { nombre: 'Jonathan Bamba', dorsal: 17, posicion: 'DEL' },
      { nombre: 'Borja Iglesias', dorsal: 7, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Iván Villar', 'Carlos Domínguez', 'Mihailo Ristić', 'Ilaix Moriba', 'Williot Swedberg', 'Pablo Durán', 'Tasos Douvikas'],
    bajasHabituales: [
      { jugador: 'Jailson Marques', posicion: 'MED', tipo: 'LESION', motivo: 'Lesión muscular aductor', gravedad: 'MODERADA', esClave: false },
      { jugador: 'Luca de la Torre', posicion: 'MED', tipo: 'DUDA', motivo: 'Tendinitis rotuliana', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Valencia': {
    sistema: '4-4-2',
    entrenador: 'Rubén Baraja',
    titulares: [
      { nombre: 'Giorgi Mamardashvili', dorsal: 25, posicion: 'POR', esClave: true },
      { nombre: 'Thierry Correia', dorsal: 12, posicion: 'DEF' },
      { nombre: 'Cristhian Mosquera', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'César Tárrega', dorsal: 15, posicion: 'DEF' },
      { nombre: 'José Luis Gayà', dorsal: 14, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Diego López', dorsal: 16, posicion: 'MED', esClave: true },
      { nombre: 'Pepelu', dorsal: 18, posicion: 'MED', esClave: true },
      { nombre: 'Enzo Barrenechea', dorsal: 5, posicion: 'MED' },
      { nombre: 'Luis Rioja', dorsal: 22, posicion: 'MED' },
      { nombre: 'Javi Guerra', dorsal: 8, posicion: 'MED' },
      { nombre: 'Hugo Duro', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Dimitrievski', 'Foulquier', 'Yarek Gasiorowski', 'Hugo Guillamón', 'André Almeida', 'Sergi Canós', 'Dani Gómez'],
    bajasHabituales: [
      { jugador: 'Mouctar Diakhaby', posicion: 'DEF', tipo: 'LESION', motivo: 'Grave luxación de rodilla', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja de larga duración' },
      { jugador: 'Rafa Mir', posicion: 'DEL', tipo: 'SANCION', motivo: 'Expediente disciplinario / baja deportiva', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Getafe': {
    sistema: '4-4-2',
    entrenador: 'José Bordalás',
    titulares: [
      { nombre: 'David Soria', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Dani Carvajal', dorsal: 14, posicion: 'DEF', esClave: true },
      { nombre: 'Djené Dakonam', dorsal: 2, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Omar Alderete', dorsal: 15, posicion: 'DEF', esClave: true },
      { nombre: 'Johan Mojica', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Mario Martín', dorsal: 5, posicion: 'MED' },
      { nombre: 'Mauro Arambarri', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Christantus Uche', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Juanmi', dorsal: 7, posicion: 'DEL' },
      { nombre: 'Enes Ünal', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Borja Mayoral', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Letáček', 'Sebastián Boselli', 'Zaid Romero', 'Ramón Terrats', 'Orel Mangala', 'Francho Serrano', 'Martín Satriano', 'Iván Azón'],
    bajasHabituales: [
      { jugador: 'Sebastián Boselli', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: false, tiempoEstimado: 'Duda de última hora' }
    ]
  },
  'Rayo Vallecano': {
    sistema: '4-2-3-1',
    entrenador: 'Íñigo Pérez',
    titulares: [
      { nombre: 'Augusto Batalla', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Andrei Rațiu', dorsal: 2, posicion: 'DEF', esClave: true },
      { nombre: 'Florian Lejeune', dorsal: 24, posicion: 'DEF', esClave: true },
      { nombre: 'Abdul Mumin', dorsal: 16, posicion: 'DEF' },
      { nombre: 'Pep Chavarría', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Óscar Valentín', dorsal: 23, posicion: 'MED', esCapitan: true },
      { nombre: 'Unai López', dorsal: 17, posicion: 'MED' },
      { nombre: 'Jorge de Frutos', dorsal: 19, posicion: 'DEL', esClave: true },
      { nombre: 'Isi Palazón', dorsal: 7, posicion: 'MED', esClave: true },
      { nombre: 'Álvaro García', dorsal: 18, posicion: 'DEL', esClave: true },
      { nombre: 'Sergio Camello', dorsal: 14, posicion: 'DEL' }
    ],
    suplentes: ['Cárdenas', 'Balliu', 'Aridane Hernández', 'Pathé Ciss', 'Gerard Gumbau', 'James Rodríguez', 'Randy Nteka', 'Raúl de Tomás'],
    bajasHabituales: [
      { jugador: 'Alfonso Espino', posicion: 'DEF', tipo: 'LESION', motivo: 'Fractura de peroné', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Mallorca': {
    sistema: '4-3-3',
    entrenador: 'Jagoba Arrasate',
    titulares: [
      { nombre: 'Dominik Greif', dorsal: 1, posicion: 'POR' },
      { nombre: 'Pablo Maffeo', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Martin Valjent', dorsal: 24, posicion: 'DEF' },
      { nombre: 'Antonio Raíllo', dorsal: 21, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Johan Mojica', dorsal: 22, posicion: 'DEF' },
      { nombre: 'Samú Costa', dorsal: 12, posicion: 'MED', esClave: true },
      { nombre: 'Manu Morlanes', dorsal: 8, posicion: 'MED' },
      { nombre: 'Sergi Darder', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Robert Navarro', dorsal: 27, posicion: 'DEL' },
      { nombre: 'Vedat Muriqi', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Cyle Larin', dorsal: 17, posicion: 'DEL' }
    ],
    suplentes: ['Leo Román', 'Mateu Morey', 'Copete', 'Toni Lato', 'Omar Mascarell', 'Antonio Sánchez', 'Dani Rodríguez', 'Chiquinho'],
    bajasHabituales: [
      { jugador: 'Takuma Asano', posicion: 'DEL', tipo: 'LESION', motivo: 'Lesión muscular en los isquiotibiales', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Alavés': {
    sistema: '4-2-3-1',
    entrenador: 'Luis García Plaza',
    titulares: [
      { nombre: 'Antonio Sivera', dorsal: 1, posicion: 'POR', esCapitan: true, esClave: true },
      { nombre: 'Nahuel Tenaglia', dorsal: 14, posicion: 'DEF' },
      { nombre: 'Abdel Abqar', dorsal: 5, posicion: 'DEF', esClave: true },
      { nombre: 'Adrián Pica', dorsal: 36, posicion: 'DEF' },
      { nombre: 'Manu Sánchez', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Ander Guevara', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Antonio Blanco', dorsal: 8, posicion: 'MED' },
      { nombre: 'Carlos Vicente', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Jon Guridi', dorsal: 18, posicion: 'MED' },
      { nombre: 'Carlos Martín', dorsal: 17, posicion: 'DEL' },
      { nombre: 'Kike García', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Owono', 'Hugo Novoa', 'Moussa Diarra', 'Joan Jordán', 'Tomás Conechny', 'Luka Romero', 'Toni Martínez', 'Asier Villalibre'],
    bajasHabituales: [
      { jugador: 'Aleksandar Sedlar', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Leganés': {
    sistema: '4-2-3-1',
    entrenador: 'Borja Jiménez',
    titulares: [
      { nombre: 'Marko Dmitrović', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Valentin Rosier', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Sergio González', dorsal: 6, posicion: 'DEF', esCapitan: true },
      { nombre: 'Matija Nastasić', dorsal: 22, posicion: 'DEF', esClave: true },
      { nombre: 'Javi Hernández', dorsal: 20, posicion: 'DEF' },
      { nombre: 'Yvan Neyou', dorsal: 17, posicion: 'MED', esClave: true },
      { nombre: 'Seydouba Cissé', dorsal: 8, posicion: 'MED' },
      { nombre: 'Juan Cruz', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Darko Brašanac', dorsal: 14, posicion: 'MED' },
      { nombre: 'Adrià Altimira', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Sébastien Haller', dorsal: 18, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Juan Soriano', 'Alhassan', 'Tapia', 'Óscar Rodríguez', 'Roberto López', 'Munir El Haddadi', 'Miguel de la Fuente'],
    bajasHabituales: [
      { jugador: 'Enric Franquesa', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura ligamento cruzado anterior', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja temporada' },
      { jugador: 'Naim García', posicion: 'DEL', tipo: 'LESION', motivo: 'Lesión muscular', gravedad: 'LEVE', esClave: false }
    ]
  }
};

// ============================================================================
// GENERADOR DINÁMICO INTELIGENTE PARA CLUBES DE SEGUNDA, COPA O EUROPA
// ============================================================================

function generateSyntheticSquad(teamName: string): TeamTacticalProfile {
  // Entrenador genérico o por convención de club
  const coach = `${teamName} Staff Técnico`;
  const defaultSystem = '4-4-2';

  const titulares: Jugador[] = [
    { nombre: `Portero Titular (${teamName})`, dorsal: 1, posicion: 'POR', esClave: true },
    { nombre: `Lateral Der. (${teamName})`, dorsal: 2, posicion: 'DEF' },
    { nombre: `Central Der. (${teamName})`, dorsal: 4, posicion: 'DEF', esClave: true },
    { nombre: `Central Izq. (${teamName})`, dorsal: 5, posicion: 'DEF', esCapitan: true },
    { nombre: `Lateral Izq. (${teamName})`, dorsal: 3, posicion: 'DEF' },
    { nombre: `Pivote Defensivo (${teamName})`, dorsal: 6, posicion: 'MED', esClave: true },
    { nombre: `Organizador (${teamName})`, dorsal: 8, posicion: 'MED' },
    { nombre: `Interior Derecho (${teamName})`, dorsal: 7, posicion: 'MED' },
    { nombre: `Extremo Izquierdo (${teamName})`, dorsal: 11, posicion: 'DEL', esClave: true },
    { nombre: `Mediapunta (${teamName})`, dorsal: 10, posicion: 'DEL' },
    { nombre: `Delantero Centro (${teamName})`, dorsal: 9, posicion: 'DEL', esClave: true }
  ];

  const suplentes = [
    `Portero Suplente (${teamName})`,
    `Defensa Polivalente (${teamName})`,
    `Centrocampista Revulsivo (${teamName})`,
    `Extremo Rápido (${teamName})`,
    `Segundo Delantero (${teamName})`
  ];

  const bajasHabituales: BajaJugador[] = [
    {
      jugador: `Mediocentro (${teamName})`,
      posicion: 'MED',
      tipo: 'DUDA',
      motivo: 'Molestias físicas de última hora',
      gravedad: 'LEVE',
      esClave: false,
      tiempoEstimado: 'Duda'
    }
  ];

  return {
    sistema: defaultSystem,
    entrenador: coach,
    titulares,
    suplentes,
    bajasHabituales
  };
}

// ============================================================================
// SERVICIO DE ANÁLISIS DE PLANTILLA Y CUANTIFICACIÓN MATEMÁTICA
// ============================================================================

export class SquadService {
  /**
   * Obtiene el reporte de alineación y estado de plantilla para un equipo.
   */
  static getTeamSquad(teamName: string, options?: { forceConfirmed?: boolean }): AlineacionEquipo {
    // Normalizar nombre de equipo para búsqueda
    const cleanName = teamName.trim();
    let profile: TeamTacticalProfile | undefined;

    for (const [key, val] of Object.entries(CANONICAL_TEAMS)) {
      if (cleanName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanName.toLowerCase())) {
        profile = val;
        break;
      }
    }

    if (!profile) {
      profile = generateSyntheticSquad(cleanName);
    }

    // Calcular impacto de las bajas
    const bajas = profile.bajasHabituales;
    const impacto = this.calculateSquadImpact(bajas);

    return {
      equipo: cleanName,
      sistema: profile.sistema,
      estado: options?.forceConfirmed ? 'CONFIRMADA' : 'PROBABLE',
      entrenador: profile.entrenador,
      titulares: profile.titulares,
      suplentesDestacados: profile.suplentes,
      bajas,
      impacto
    };
  }

  /**
   * Cuantifica el impacto de las bajas en los multiplicadores ofensivo y defensivo (lambda / mu).
   */
  static calculateSquadImpact(bajas: BajaJugador[]): ImpactoPlantilla {
    let penaltyOfensivo = 0.0;
    let penaltyDefensivo = 0.0;
    let claveCount = 0;

    for (const baja of bajas) {
      const isClave = baja.esClave;
      if (isClave) claveCount++;

      // Ponderación por gravedad
      const weight = baja.gravedad === 'CRITICA' ? 1.0 : (baja.gravedad === 'MODERADA' ? 0.6 : 0.25);

      if (baja.posicion === 'DEL' || baja.posicion === 'MED') {
        penaltyOfensivo += (isClave ? 0.08 : 0.03) * weight;
      }

      if (baja.posicion === 'DEF' || baja.posicion === 'POR') {
        penaltyDefensivo += (isClave ? 0.09 : 0.035) * weight;
      }
    }

    // Factores resultantes
    const factorOfensivo = Number(Math.max(0.70, 1.0 - penaltyOfensivo).toFixed(3));
    const factorDefensivo = Number(Math.min(1.35, 1.0 + penaltyDefensivo).toFixed(3));

    let nivelAlerta: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO' = 'BAJO';
    if (claveCount >= 2 || penaltyOfensivo >= 0.12 || penaltyDefensivo >= 0.12) {
      nivelAlerta = 'CRITICO';
    } else if (claveCount === 1 || penaltyOfensivo >= 0.06 || penaltyDefensivo >= 0.06) {
      nivelAlerta = 'ALTO';
    } else if (bajas.length > 0) {
      nivelAlerta = 'MEDIO';
    }

    let resumen = 'Plantilla prácticamente al completo. Sin bajas de primer nivel.';
    if (nivelAlerta === 'CRITICO') {
      resumen = `Alerta Crítica: ${claveCount} bajas estructurales clave. Pérdida del ${Math.round(penaltyOfensivo * 100)}% de xG en ataque y +${Math.round(penaltyDefensivo * 100)}% de fragilidad defensiva.`;
    } else if (nivelAlerta === 'ALTO') {
      resumen = `Bajas sensibles en el esquema titular. Afecta al ${Math.round(penaltyOfensivo * 100)}% del potencial ofensivo.`;
    } else if (nivelAlerta === 'MEDIO') {
      resumen = 'Incidencias físicas leves o dudas menores que el cuerpo técnico puede solventar con rotaciones.';
    }

    return {
      nivelAlerta,
      resumen,
      factorOfensivo,
      factorDefensivo,
      bajasClaveCount: claveCount
    };
  }

  /**
   * Genera el reporte comparativo táctico entre dos contendientes de un partido.
   */
  static getMatchSquadReport(homeTeam: string, awayTeam: string, isFinishedOrPlaying?: boolean): MatchSquadReport {
    const local = this.getTeamSquad(homeTeam, { forceConfirmed: isFinishedOrPlaying });
    const visitante = this.getTeamSquad(awayTeam, { forceConfirmed: isFinishedOrPlaying });

    // Determinar ventaja por bajas
    let ventajaPlantilla: 'LOCAL' | 'VISITANTE' | 'EQUILIBRADO' = 'EQUILIBRADO';
    const localScore = (local.impacto.bajasClaveCount * 2) + local.bajas.length;
    const awayScore = (visitante.impacto.bajasClaveCount * 2) + visitante.bajas.length;

    if (awayScore >= localScore + 2) {
      ventajaPlantilla = 'LOCAL'; // El visitante tiene muchas más bajas
    } else if (localScore >= awayScore + 2) {
      ventajaPlantilla = 'VISITANTE'; // El local tiene muchas más bajas
    }

    let resumenTactico = `Duelo táctico ${local.sistema} vs ${visitante.sistema}.`;
    if (ventajaPlantilla === 'LOCAL') {
      resumenTactico += ` Ventaja para ${local.equipo}: ${visitante.equipo} acude mermado por ausencias clave (${visitante.impacto.resumen}).`;
    } else if (ventajaPlantilla === 'VISITANTE') {
      resumenTactico += ` Oportunidad para ${visitante.equipo}: ${local.equipo} presenta ausencias de peso en su once (${local.impacto.resumen}).`;
    } else {
      resumenTactico += ' Equilibrio de disponibilidad en ambas plantillas.';
    }

    return {
      local,
      visitante,
      resumenTactico,
      ventajaPlantilla
    };
  }
}
