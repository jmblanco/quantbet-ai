import { Jugador, BajaJugador } from './squad-service.js';

export interface TeamTacticalProfile {
  sistema: string;
  entrenador: string;
  titulares: Jugador[];
  suplentes: string[];
  bajasHabituales: BajaJugador[];
}

export const CANONICAL_TEAMS: Record<string, TeamTacticalProfile> = {
  // ==========================================================================
  // PRIMERA DIVISIÓN (LALIGA EA SPORTS) - 20 CLUBES
  // ==========================================================================
  'Real Madrid': {
    sistema: '4-3-3',
    entrenador: 'Carlo Ancelotti',
    titulares: [
      { nombre: 'Thibaut Courtois', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Lucas Vázquez', dorsal: 17, posicion: 'DEF', esClave: true },
      { nombre: 'Éder Militão', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Antonio Rüdiger', dorsal: 22, posicion: 'DEF', esClave: true },
      { nombre: 'Ferland Mendy', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Federico Valverde', dorsal: 8, posicion: 'MED', esClave: true, esCapitan: true },
      { nombre: 'Aurélien Tchouaméni', dorsal: 14, posicion: 'MED' },
      { nombre: 'Jude Bellingham', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Rodrygo Goes', dorsal: 11, posicion: 'DEL' },
      { nombre: 'Kylian Mbappé', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Vinícius Jr.', dorsal: 7, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Andriy Lunin', 'Jesús Vallejo', 'Raúl Asencio', 'Fran García', 'Eduardo Camavinga', 'Luka Modrić', 'Dani Ceballos', 'Arda Güler', 'Brahim Díaz', 'Endrick'],
    bajasHabituales: [
      { jugador: 'Dani Carvajal', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado anterior, colateral externo y tendón poplíteo', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja de larga duración' },
      { jugador: 'David Alaba', posicion: 'DEF', tipo: 'LESION', motivo: 'Fase de readaptación funcional tras rotura de ligamento cruzado anterior', gravedad: 'MODERADA', esClave: true, tiempoEstimado: 'Baja médica' },
      { jugador: 'Eduardo Camavinga', posicion: 'MED', tipo: 'DUDA', motivo: 'Sobrecarga muscular leve', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Barcelona': {
    sistema: '4-2-3-1',
    entrenador: 'Hansi Flick',
    titulares: [
      { nombre: 'Iñaki Peña', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Jules Koundé', dorsal: 23, posicion: 'DEF', esClave: true },
      { nombre: 'Pau Cubarsí', dorsal: 2, posicion: 'DEF', esClave: true },
      { nombre: 'Iñigo Martínez', dorsal: 5, posicion: 'DEF', esClave: true },
      { nombre: 'Alejandro Balde', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Marc Casadó', dorsal: 17, posicion: 'MED', esClave: true },
      { nombre: 'Pedri González', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Dani Olmo', dorsal: 20, posicion: 'MED', esClave: true },
      { nombre: 'Lamine Yamal', dorsal: 19, posicion: 'DEL', esClave: true },
      { nombre: 'Robert Lewandowski', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Raphinha Belloli', dorsal: 11, posicion: 'DEL', esClave: true, esCapitan: true }
    ],
    suplentes: ['Wojciech Szczęsny', 'Ander Astralaga', 'Eric Garcia', 'Andreas Christensen', 'Frenkie de Jong', 'Gavi', 'Fermín López', 'Ferran Torres', 'Pau Víctor', 'Pablo Torre'],
    bajasHabituales: [
      { jugador: 'Marc-André ter Stegen', posicion: 'POR', tipo: 'LESION', motivo: 'Rotura completa de tendón rotuliano', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja médica' },
      { jugador: 'Marc Bernal', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado anterior', gravedad: 'CRITICA', esClave: false },
      { jugador: 'Ronald Araújo', posicion: 'DEF', tipo: 'DUDA', motivo: 'Fase final de recuperación de tendón isquiotibial', gravedad: 'LEVE', esClave: true }
    ]
  },
  'At. Madrid': {
    sistema: '4-4-2',
    entrenador: 'Diego Pablo Simeone',
    titulares: [
      { nombre: 'Jan Oblak', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Marcos Llorente', dorsal: 14, posicion: 'DEF', esClave: true },
      { nombre: 'José María Giménez', dorsal: 2, posicion: 'DEF', esClave: true },
      { nombre: 'Robin Le Normand', dorsal: 24, posicion: 'DEF', esClave: true },
      { nombre: 'Javi Galán', dorsal: 21, posicion: 'DEF' },
      { nombre: 'Giuliano Simeone', dorsal: 22, posicion: 'MED' },
      { nombre: 'Rodrigo De Paul', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Koke Resurrección', dorsal: 6, posicion: 'MED', esCapitan: true },
      { nombre: 'Conor Gallagher', dorsal: 4, posicion: 'MED' },
      { nombre: 'Antoine Griezmann', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Julián Álvarez', dorsal: 19, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Juan Musso', 'Axel Witsel', 'Reinildo Mandava', 'Nahuel Molina', 'César Azpilicueta', 'Pablo Barrios', 'Samuel Lino', 'Rodrigo Riquelme', 'Alexander Sørloth', 'Ángel Correa'],
    bajasHabituales: [
      { jugador: 'Robin Le Normand', posicion: 'DEF', tipo: 'DUDA', motivo: 'Readaptación progresiva tras traumatismo craneoencefálico', gravedad: 'MODERADA', esClave: true, tiempoEstimado: 'Duda médica' },
      { jugador: 'Pablo Barrios', posicion: 'MED', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: false }
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
      { nombre: 'Beñat Prados', dorsal: 24, posicion: 'MED' },
      { nombre: 'Iñaki Williams', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Oihan Sancet', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Nico Williams', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Gorka Guruzeta', dorsal: 12, posicion: 'DEL' }
    ],
    suplentes: ['Unai Simón', 'Andoni Gorosabel', 'Yeray Álvarez', 'Unai Núñez', 'Mikel Jauregizar', 'Unai Gómez', 'Ander Herrera', 'Álex Berenguer', 'Álvaro Djaló'],
    bajasHabituales: [
      { jugador: 'Unai Simón', posicion: 'POR', tipo: 'LESION', motivo: 'Operación de muñeca / readaptación progresiva', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja médica' }
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
    suplentes: ['Unai Marrero', 'Aritz Elustondo', 'Jon Pacheco', 'Javi López', 'Aihen Muñoz', 'Beñat Turrientes', 'Pablo Marín', 'Sheraldo Becker', 'Orri Óskarsson', 'Umar Sadiq'],
    bajasHabituales: [
      { jugador: 'Hamari Traoré', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado', gravedad: 'CRITICA', esClave: true },
      { jugador: 'Arsen Zakharyan', posicion: 'MED', tipo: 'LESION', motivo: 'Tendón peroneo de tobillo', gravedad: 'LEVE', esClave: false }
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
    suplentes: ['Adrián San Miguel', 'Fran Vieites', 'Youssouf Sabaly', 'Natan', 'Ricardo Rodríguez', 'Marc Roca', 'Aitor Ruibal', 'Chimy Ávila', 'Cédric Bakambu', 'Assane Diao', 'Juanmi'],
    bajasHabituales: [
      { jugador: 'Isco Alarcón', posicion: 'MED', tipo: 'LESION', motivo: 'Fisura en peroné izquierdo', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja de larga duración' },
      { jugador: 'William Carvalho', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura de tendón de Aquiles', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Villarreal': {
    sistema: '4-4-2',
    entrenador: 'Marcelino García Toral',
    titulares: [
      { nombre: 'Diego Conde', dorsal: 13, posicion: 'POR' },
      { nombre: 'Kiko Femenía', dorsal: 17, posicion: 'DEF' },
      { nombre: 'Raúl Albiol', dorsal: 3, posicion: 'DEF', esCapitan: true },
      { nombre: 'Logan Costa', dorsal: 2, posicion: 'DEF', esClave: true },
      { nombre: 'Sergi Cardona', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Yeremy Pino', dorsal: 21, posicion: 'MED' },
      { nombre: 'Dani Parejo', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Santi Comesaña', dorsal: 14, posicion: 'MED' },
      { nombre: 'Álex Baena', dorsal: 16, posicion: 'MED', esClave: true },
      { nombre: 'Ayoze Pérez', dorsal: 22, posicion: 'DEL', esClave: true },
      { nombre: 'Thierno Barry', dorsal: 15, posicion: 'DEL' }
    ],
    suplentes: ['Luiz Júnior', 'Eric Bailly', 'Willy Kambwala', 'Juan Foyth', 'Pape Gueye', 'Denis Suárez', 'Ilias Akhomach', 'Nicolas Pépé'],
    bajasHabituales: [
      { jugador: 'Gerard Moreno', posicion: 'DEL', tipo: 'LESION', motivo: 'Lesión recurrente en el isquiotibial', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Duda constante' },
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
      { nombre: 'Marcao Teixeira', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Adrià Pedrosa', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Nemanja Gudelj', dorsal: 6, posicion: 'MED' },
      { nombre: 'Lucien Agoumé', dorsal: 18, posicion: 'MED' },
      { nombre: 'Albert Sambi Lokonga', dorsal: 12, posicion: 'MED' },
      { nombre: 'Dodi Lukébakio', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Isaac Romero', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Chidera Ejuke', dorsal: 21, posicion: 'DEL' }
    ],
    suplentes: ['Álvaro Fernández', 'Kike Salas', 'Juanlu Sánchez', 'Valentín Barco', 'Djibril Sow', 'Peque Fernández', 'Pedro Ortiz', 'Kelechi Iheanacho'],
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
    suplentes: ['Aitor Fernández', 'Unai García', 'Jorge Herrando', 'Pablo Ibáñez', 'Moi Gómez', 'Iker Muñoz', 'Kike Barja', 'Raúl García de Haro'],
    bajasHabituales: [
      { jugador: 'José Arnaiz', posicion: 'DEL', tipo: 'DUDA', motivo: 'Molestias musculares en el gemelo', gravedad: 'LEVE', esClave: false }
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
    suplentes: ['Iván Villar', 'Carlos Domínguez', 'Javier Manquillo', 'Mihailo Ristić', 'Ilaix Moriba', 'Damián Rodríguez', 'Williot Swedberg', 'Pablo Durán', 'Tasos Douvikas'],
    bajasHabituales: [
      { jugador: 'Jailson Marques', posicion: 'MED', tipo: 'LESION', motivo: 'Lesión muscular en el aductor', gravedad: 'MODERADA', esClave: false },
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
      { nombre: 'Javi Guerra', dorsal: 8, posicion: 'DEL' },
      { nombre: 'Hugo Duro', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Stole Dimitrievski', 'Dimitri Foulquier', 'Yarek Gasiorowski', 'Jesús Vázquez', 'Hugo Guillamón', 'André Almeida', 'Sergi Canós', 'Germán Valera', 'Dani Gómez'],
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
      { nombre: 'Juan Iglesias', dorsal: 21, posicion: 'DEF', esClave: true },
      { nombre: 'Djené Dakonam', dorsal: 2, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Omar Alderete', dorsal: 15, posicion: 'DEF', esClave: true },
      { nombre: 'Diego Rico', dorsal: 16, posicion: 'DEF' },
      { nombre: 'Carles Pérez', dorsal: 17, posicion: 'MED' },
      { nombre: 'Luis Milla', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Mauro Arambarri', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Christantus Uche', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Borja Mayoral', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Bertuğ Yıldırım', dorsal: 10, posicion: 'DEL' }
    ],
    suplentes: ['Jiří Letáček', 'Allan Nyom', 'Juan Berrocal', 'Fabrizio Angileri', 'Ramón Terrats', 'Jesús Santiago Yellu', 'Álex Sola', 'Peter Federico', 'Álvaro Rodríguez', 'Alberto Risco'],
    bajasHabituales: [
      { jugador: 'Borja Mayoral', posicion: 'DEL', tipo: 'DUDA', motivo: 'Gestión de cargas tras molestias en la rodilla', gravedad: 'MODERADA', esClave: true, tiempoEstimado: 'Duda de última hora' },
      { jugador: 'Juan Berrocal', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: false }
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
    suplentes: ['Dani Cárdenas', 'Iván Balliu', 'Aridane Hernández', 'Pathé Ciss', 'Gerard Gumbau', 'Pedro Díaz', 'Adrián Embarba', 'James Rodríguez', 'Randy Nteka', 'Raúl de Tomás'],
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
    suplentes: ['Leo Román', 'Mateu Morey', 'José Manuel Copete', 'Toni Lato', 'Omar Mascarell', 'Antonio Sánchez', 'Dani Rodríguez', 'Chiquinho', 'Abdón Prats'],
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
    suplentes: ['Jesús Owono', 'Hugo Novoa', 'Moussa Diarra', 'Aleksandar Sedlar', 'Joan Jordán', 'Tomás Conechny', 'Luka Romero', 'Toni Martínez', 'Asier Villalibre'],
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
      { nombre: 'Renato Tapia', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Seydouba Cissé', dorsal: 8, posicion: 'MED' },
      { nombre: 'Darko Brašanac', dorsal: 14, posicion: 'MED' },
      { nombre: 'Juan Cruz', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Sébastien Haller', dorsal: 18, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Juan Soriano', 'Adrià Altimira', 'Jorge Sáenz', 'Óscar Rodríguez', 'Roberto López', 'Munir El Haddadi', 'Dani Raba', 'Miguel de la Fuente'],
    bajasHabituales: [
      { jugador: 'Enric Franquesa', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura ligamento cruzado anterior', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja temporada' },
      { jugador: 'Naim García', posicion: 'DEL', tipo: 'LESION', motivo: 'Lesión muscular', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Girona': {
    sistema: '4-2-3-1',
    entrenador: 'Míchel Sánchez',
    titulares: [
      { nombre: 'Paulo Gazzaniga', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Arnau Martínez', dorsal: 4, posicion: 'DEF' },
      { nombre: 'David López', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Daley Blind', dorsal: 17, posicion: 'DEF', esClave: true },
      { nombre: 'Miguel Gutiérrez', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Yangel Herrera', dorsal: 21, posicion: 'MED', esClave: true },
      { nombre: 'Oriol Romeu', dorsal: 14, posicion: 'MED' },
      { nombre: 'Iván Martín', dorsal: 23, posicion: 'MED', esClave: true },
      { nombre: 'Bryan Gil', dorsal: 20, posicion: 'DEL', esClave: true },
      { nombre: 'Abel Ruiz', dorsal: 9, posicion: 'DEL' },
      { nombre: 'Portu', dorsal: 24, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Pau López', 'Alejandro Francés', 'Ladislav Krejčí', 'Juanpe', 'Donny van de Beek', 'Jhon Solís', 'Yáser Asprilla', 'Bojan Miovski', 'Christian Stuani'],
    bajasHabituales: [
      { jugador: 'Viktor Tsygankov', posicion: 'DEL', tipo: 'LESION', motivo: 'Lesión en el bíceps femoral', gravedad: 'MODERADA', esClave: true, tiempoEstimado: 'Baja médica' },
      { jugador: 'Jhon Solís', posicion: 'MED', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Espanyol': {
    sistema: '4-4-2',
    entrenador: 'Manolo González',
    titulares: [
      { nombre: 'Joan Garcia', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Omar El Hilali', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Marash Kumbulla', dorsal: 4, posicion: 'DEF', esClave: true },
      { nombre: 'Leandro Cabrera', dorsal: 6, posicion: 'DEF', esCapitan: true },
      { nombre: 'Carlos Romero', dorsal: 22, posicion: 'DEF' },
      { nombre: 'Álvaro Tejero', dorsal: 12, posicion: 'MED' },
      { nombre: 'Alex Král', dorsal: 20, posicion: 'MED', esClave: true },
      { nombre: 'Pol Lozano', dorsal: 10, posicion: 'MED' },
      { nombre: 'Jofre Carreras', dorsal: 17, posicion: 'MED' },
      { nombre: 'Javi Puado', dorsal: 7, posicion: 'DEL', esCapitan: true, esClave: true },
      { nombre: 'Alejo Véliz', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Fernando Pacheco', 'Sergi Gómez', 'Brian Oliván', 'José Gragera', 'Álvaro Aguado', 'Edu Expósito', 'Antoniu Roca', 'Irvin Cardona', 'Walid Cheddira'],
    bajasHabituales: [
      { jugador: 'Edu Expósito', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado', gravedad: 'CRITICA', esClave: true },
      { jugador: 'José Gragera', posicion: 'MED', tipo: 'DUDA', motivo: 'Molestias en el pie', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Las Palmas': {
    sistema: '4-2-3-1',
    entrenador: 'Diego Martínez',
    titulares: [
      { nombre: 'Jasper Cillessen', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Viti Rozada', dorsal: 22, posicion: 'DEF' },
      { nombre: 'Álex Suárez', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Scott McKenna', dorsal: 15, posicion: 'DEF', esClave: true },
      { nombre: 'Álex Muñoz', dorsal: 23, posicion: 'DEF' },
      { nombre: 'Dario Essugo', dorsal: 20, posicion: 'MED', esClave: true },
      { nombre: 'José Campaña', dorsal: 8, posicion: 'MED' },
      { nombre: 'Kirian Rodríguez', dorsal: 12, posicion: 'MED', esCapitan: true, esClave: true },
      { nombre: 'Alberto Moleiro', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Sandro Ramírez', dorsal: 19, posicion: 'DEL', esClave: true },
      { nombre: 'Fábio Silva', dorsal: 37, posicion: 'DEL' }
    ],
    suplentes: ['Dinko Horkaš', 'Marvin Park', 'Mika Mármol', 'Juanma Herzog', 'Daley Sinkgraven', 'Javi Muñoz', 'Enzo Loiodice', 'Manu Fuster', 'Adnan Januzaj', 'Oli McBurnie', 'Jaime Mata'],
    bajasHabituales: [
      { jugador: 'Marvin Park', posicion: 'DEF', tipo: 'LESION', motivo: 'Lesión en los isquiotibiales', gravedad: 'MODERADA', esClave: false },
      { jugador: 'Mika Mármol', posicion: 'DEF', tipo: 'DUDA', motivo: 'Molestias en el tobillo', gravedad: 'LEVE', esClave: true }
    ]
  },
  'Valladolid': {
    sistema: '4-2-3-1',
    entrenador: 'Paulo Pezzolano',
    titulares: [
      { nombre: 'Karl Hein', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Luis Pérez', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Javi Sánchez', dorsal: 15, posicion: 'DEF', esCapitan: true },
      { nombre: 'David Torres', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Lucas Rosa', dorsal: 22, posicion: 'DEF' },
      { nombre: 'Eray Cömert', dorsal: 6, posicion: 'MED' },
      { nombre: 'Stanko Jurić', dorsal: 20, posicion: 'MED', esClave: true },
      { nombre: 'Kike Pérez', dorsal: 8, posicion: 'MED' },
      { nombre: 'Selim Amallah', dorsal: 21, posicion: 'MED' },
      { nombre: 'Raúl Moro', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Juanmi Latasa', dorsal: 14, posicion: 'DEL' }
    ],
    suplentes: ['André Ferreira', 'Cenk Özkacar', 'Mario Martín', 'Víctor Meseguer', 'Chuki', 'Iván Sánchez', 'Amath Ndiaye', 'Mamadou Sylla', 'Marcos André'],
    bajasHabituales: [
      { jugador: 'Cenk Özkacar', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura fibrilar bíceps femoral', gravedad: 'MODERADA', esClave: false },
      { jugador: 'Javi Sánchez', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: true }
    ]
  },

  // ==========================================================================
  // SEGUNDA DIVISIÓN (LALIGA HYPERMOTION) - 22 CLUBES
  // ==========================================================================
  'Levante': {
    sistema: '4-4-2',
    entrenador: 'Julián Calero',
    titulares: [
      { nombre: 'Andrés Fernández', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Andrés García', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Adrián de la Fuente', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Unai Elgezabal', dorsal: 5, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Diego Pampín', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Carlos Álvarez', dorsal: 11, posicion: 'MED', esClave: true },
      { nombre: 'Oriol Rey', dorsal: 20, posicion: 'MED' },
      { nombre: 'Giorgi Kochorashvili', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Roger Brugué', dorsal: 7, posicion: 'MED' },
      { nombre: 'José Luis Morales', dorsal: 18, posicion: 'DEL', esClave: true },
      { nombre: 'Iván Romero', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Alfonso Pastor', 'Marcos Navarro', 'Jorge Cabello', 'Ángel Algobia', 'Sergio Lozano', 'Fabrício Santos', 'Carlos Espí'],
    bajasHabituales: [
      { jugador: 'Vicente Iborra', posicion: 'MED', tipo: 'LESION', motivo: 'Molestias fascia plantar', gravedad: 'MODERADA', esClave: true }
    ]
  },
  'Real Zaragoza': {
    sistema: '4-4-2',
    entrenador: 'Víctor Fernández',
    titulares: [
      { nombre: 'Gaëtan Poussin', dorsal: 13, posicion: 'POR' },
      { nombre: 'Iván Calero', dorsal: 22, posicion: 'DEF' },
      { nombre: 'Lluís López', dorsal: 24, posicion: 'DEF', esCapitan: true },
      { nombre: 'Bernardo Vital', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Dani Tasende', dorsal: 18, posicion: 'DEF' },
      { nombre: 'Keidi Bare', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Marc Aguado', dorsal: 8, posicion: 'MED' },
      { nombre: 'Ager Aketxe', dorsal: 23, posicion: 'MED', esClave: true },
      { nombre: 'Adrián Liso', dorsal: 33, posicion: 'MED' },
      { nombre: 'Samed Baždar', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Mario Soberón', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Joan Femenías', 'Jair Amador', 'Enrique Clemente', 'Toni Moya', 'Francho Serrano', 'Pau Sans', 'Alberto Marí'],
    bajasHabituales: [
      { jugador: 'Mario Soberón', posicion: 'DEL', tipo: 'DUDA', motivo: 'Sobrecarga en los isquiotibiales', gravedad: 'MODERADA', esClave: true }
    ]
  },
  'Sporting de Gijón': {
    sistema: '4-3-3',
    entrenador: 'Rubén Albés',
    titulares: [
      { nombre: 'Rubén Yáñez', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Guille Rosas', dorsal: 2, posicion: 'DEF', esClave: true },
      { nombre: 'Eric Curbelo', dorsal: 6, posicion: 'DEF' },
      { nombre: 'Róber Pier', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Pablo García', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Lander Olaetxea', dorsal: 5, posicion: 'MED', esClave: true },
      { nombre: 'Nacho Méndez', dorsal: 10, posicion: 'MED', esCapitan: true },
      { nombre: 'César Gelabert', dorsal: 18, posicion: 'MED' },
      { nombre: 'Jonathan Dubasin', dorsal: 22, posicion: 'DEL', esClave: true },
      { nombre: 'Juan Otero', dorsal: 19, posicion: 'DEL', esClave: true },
      { nombre: 'Dani Queipo', dorsal: 11, posicion: 'DEL' }
    ],
    suplentes: ['Christian Sánchez', 'Diego Sánchez', 'Kevin Vázquez', 'Jesús Bernal', 'Nacho Martín', 'Jordy Caicedo', 'Víctor Campuzano'],
    bajasHabituales: [
      { jugador: 'Eric Curbelo', posicion: 'DEF', tipo: 'DUDA', motivo: 'Molestias musculares', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Racing Santander': {
    sistema: '4-2-3-1',
    entrenador: 'José Alberto López',
    titulares: [
      { nombre: 'Jokin Ezkieta', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Clément Michelin', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Manu Hernando', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Javi Castro', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Saúl García', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Unai Vencedor', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Aritz Aldasoro', dorsal: 8, posicion: 'MED' },
      { nombre: 'Andrés Martín', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Pablo Rodríguez', dorsal: 10, posicion: 'MED' },
      { nombre: 'Iñigo Vicente', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Juan Carlos Arana', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Miquel Parera', 'Marco Sangalli', 'Pol Moreno', 'Mario García', 'Maguette Gueye', 'Íñigo Sainz-Maza', 'Suleiman Camara', 'Ekain Zenitagoia', 'Karrikaburu'],
    bajasHabituales: [
      { jugador: 'Íñigo Sainz-Maza', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado', gravedad: 'CRITICA', esClave: true }
    ]
  },
  'Real Oviedo': {
    sistema: '4-2-3-1',
    entrenador: 'Javier Calleja',
    titulares: [
      { nombre: 'Aarón Escandell', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Oier Luengo', dorsal: 15, posicion: 'DEF' },
      { nombre: 'Dani Calvo', dorsal: 12, posicion: 'DEF', esCapitan: true },
      { nombre: 'David Costas', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Rahim Alhassane', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Kwasi Sibo', dorsal: 6, posicion: 'MED' },
      { nombre: 'Santi Cazorla', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Haissem Hassan', dorsal: 17, posicion: 'DEL', esClave: true },
      { nombre: 'Jaime Seoane', dorsal: 10, posicion: 'MED' },
      { nombre: 'Ilyas Chaira', dorsal: 11, posicion: 'DEL' },
      { nombre: 'Alemão', dorsal: 19, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Quentin Braat', 'Lucas Ahijado', 'Carlos Pomares', 'Alberto del Moral', 'Santiago Colombatto', 'Paulino de la Fuente', 'Sebas Moyano', 'Federico Viñas', 'Daniel Paraschiv'],
    bajasHabituales: [
      { jugador: 'David Costas', posicion: 'DEF', tipo: 'DUDA', motivo: 'Molestias musculares en aductores', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Granada': {
    sistema: '4-4-2',
    entrenador: 'Fran Escribá',
    titulares: [
      { nombre: 'Diego Mariño', dorsal: 25, posicion: 'POR' },
      { nombre: 'Ricard Sánchez', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Miguel Rubio', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Loïc Williams', dorsal: 24, posicion: 'DEF', esClave: true },
      { nombre: 'Miguel Ángel Brau', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Martin Hongla', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Gonzalo Villar', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Giorgi Tsitaishvili', dorsal: 11, posicion: 'MED' },
      { nombre: 'Kamil Jóźwiak', dorsal: 7, posicion: 'MED' },
      { nombre: 'Myrto Uzuni', dorsal: 19, posicion: 'DEL', esCapitan: true, esClave: true },
      { nombre: 'Lucas Boyé', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Marc Martínez', 'Ignasi Miquel', 'Pablo Insua', 'Sergio Ruiz', 'Manu Trigueros', 'Reinier Jesus', 'Siren Diao', 'Shon Weissman'],
    bajasHabituales: [
      { jugador: 'Carlos Neva', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura fibrilar en los isquiotibiales', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Elche': {
    sistema: '3-5-2',
    entrenador: 'Eder Sarabia',
    titulares: [
      { nombre: 'Matías Dituro', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Álvaro Núñez', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Mario Gaspar', dorsal: 15, posicion: 'DEF', esCapitan: true },
      { nombre: 'David Affengruber', dorsal: 22, posicion: 'DEF', esClave: true },
      { nombre: 'Pedro Bigas', dorsal: 6, posicion: 'DEF' },
      { nombre: 'Yago Santiago', dorsal: 17, posicion: 'MED' },
      { nombre: 'Nicolás Castro', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Aleix Febas', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Gerard Hernández', dorsal: 14, posicion: 'MED' },
      { nombre: 'Nico Fernández', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Agustín Álvarez', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['San Román', 'Álex Martín', 'José Salinas', 'Rodrigo Mendoza', 'Josan Ferrández', 'Elbasan Rashani', 'Sory Kaba', 'Mourad El Ghezouani'],
    bajasHabituales: [
      { jugador: 'Carlos Clerc', posicion: 'DEF', tipo: 'LESION', motivo: 'Recuperación problemas de pubis', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Eibar': {
    sistema: '4-2-3-1',
    entrenador: 'Joseba Etxeberria',
    titulares: [
      { nombre: 'Daniel Fuzato', dorsal: 1, posicion: 'POR' },
      { nombre: 'José Corpas', dorsal: 17, posicion: 'DEF' },
      { nombre: 'Álvaro Carrillo', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Aritz Arambarri', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Hodei Arrillaga', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Sergio Álvarez', dorsal: 6, posicion: 'MED', esCapitan: true },
      { nombre: 'Matheus Pereira', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Xeber Alkain', dorsal: 7, posicion: 'DEL' },
      { nombre: 'Ander Madariaga', dorsal: 14, posicion: 'MED' },
      { nombre: 'Antonio Puertas', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Jon Bautista', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Jonmi Magunagoitia', 'Chema Rodríguez', 'Cristian Gutiérrez', 'Peru Nolaskoain', 'Kento Hashimoto', 'Javi Martínez', 'Martín Merquelanz', 'Jorge Pascual', 'Slavy'],
    bajasHabituales: [
      { jugador: 'Jon Guruzeta', posicion: 'DEL', tipo: 'LESION', motivo: 'Rotura muscular', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Almería': {
    sistema: '4-2-3-1',
    entrenador: 'Rubi',
    titulares: [
      { nombre: 'Luís Maximiano', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Marc Pubill', dorsal: 18, posicion: 'DEF', esClave: true },
      { nombre: 'Chumi', dorsal: 21, posicion: 'DEF', esCapitan: true },
      { nombre: 'Edgar González', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Álex Centelles', dorsal: 20, posicion: 'DEF' },
      { nombre: 'Iddrisu Baba', dorsal: 4, posicion: 'MED' },
      { nombre: 'Dion Lopy', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Sergio Arribas', dorsal: 11, posicion: 'MED', esClave: true },
      { nombre: 'Gonzalo Melero', dorsal: 8, posicion: 'MED' },
      { nombre: 'Nico Melamed', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Luis Suárez', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Fernando Martínez', 'Kaiky', 'Milan Radovanović', 'Alejandro Pozo', 'Gui Guedes', 'Arnau Puigmal', 'Marko Milovanović', 'Rachad Fettal'],
    bajasHabituales: [
      { jugador: 'Lucas Robertone', posicion: 'MED', tipo: 'LESION', motivo: 'Operación de hombro', gravedad: 'CRITICA', esClave: true, tiempoEstimado: 'Baja prolongada' }
    ]
  },
  'Deportivo': {
    sistema: '4-2-3-1',
    entrenador: 'Óscar Gilsanz',
    titulares: [
      { nombre: 'Helton Leite', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Ximo Navarro', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Pablo Vázquez', dorsal: 5, posicion: 'DEF', esClave: true },
      { nombre: 'Dani Barcia', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Rafael Obrador', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Diego Villares', dorsal: 8, posicion: 'MED', esCapitan: true },
      { nombre: 'Omenuke Mfulu', dorsal: 6, posicion: 'MED' },
      { nombre: 'David Mella', dorsal: 17, posicion: 'DEL', esClave: true },
      { nombre: 'Lucas Pérez', dorsal: 7, posicion: 'DEL', esCapitan: true, esClave: true },
      { nombre: 'Mario Soriano', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Ivan Barbero', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Germán Parreño', 'Álex Petxarroman', 'Jaime Sánchez', 'José Ángel Jurado', 'Hugo Rama', 'Cristian Herrera', 'Davo', 'Zakaria Bouldini'],
    bajasHabituales: [
      { jugador: 'Yeremay Hernández', posicion: 'DEL', tipo: 'DUDA', motivo: 'Molestias musculares en rodilla', gravedad: 'MODERADA', esClave: true }
    ]
  },
  'Cádiz': {
    sistema: '4-4-2',
    entrenador: 'Paco López',
    titulares: [
      { nombre: 'David Gil', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Iza Carcelén', dorsal: 20, posicion: 'DEF', esCapitan: true },
      { nombre: 'Fali', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Víctor Chust', dorsal: 5, posicion: 'DEF' },
      { nombre: 'José Joaquín Matos', dorsal: 18, posicion: 'DEF' },
      { nombre: 'Rubén Alcaraz', dorsal: 4, posicion: 'MED', esClave: true },
      { nombre: 'Gonzalo Escalante', dorsal: 8, posicion: 'MED' },
      { nombre: 'Brian Ocampo', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Javi Ontiveros', dorsal: 22, posicion: 'MED', esClave: true },
      { nombre: 'Chris Ramos', dorsal: 16, posicion: 'DEL', esClave: true },
      { nombre: 'Carlos Fernández', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['José Antonio Caro', 'Cristian Glauder', 'Bojan Kovačević', 'Álex Fernández', 'Rominigue Kouamé', 'Iván Alejo', 'Rubén Sobrino', 'Roger Martí'],
    bajasHabituales: [
      { jugador: 'Luis Hernández', posicion: 'DEF', tipo: 'LESION', motivo: 'Lesión de rodilla', gravedad: 'CRITICA', esClave: true }
    ]
  },
  'Tenerife': {
    sistema: '4-4-2',
    entrenador: 'Pepe Mel',
    titulares: [
      { nombre: 'Salvi Carrasco', dorsal: 1, posicion: 'POR' },
      { nombre: 'Jérémy Mellot', dorsal: 22, posicion: 'DEF' },
      { nombre: 'José León', dorsal: 4, posicion: 'DEF', esClave: true },
      { nombre: 'Josep Gayà', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Fernando Medrano', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Yussi Diarra', dorsal: 15, posicion: 'MED', esClave: true },
      { nombre: 'Sergio González', dorsal: 6, posicion: 'MED' },
      { nombre: 'Luismi Cruz', dorsal: 17, posicion: 'MED', esClave: true },
      { nombre: 'Waldo Rubio', dorsal: 11, posicion: 'MED' },
      { nombre: 'Enric Gallego', dorsal: 18, posicion: 'DEL', esCapitan: true, esClave: true },
      { nombre: 'Ángel Rodríguez', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Tomeu Nadal', 'David Rodríguez', 'Adrián Guerrero', 'Aarón Martín', 'Maikel Mesa', 'Teto', 'Yann Bodiger', 'Alassan', 'Yanis Senhadji'],
    bajasHabituales: [
      { jugador: 'Aitor Sanz', posicion: 'MED', tipo: 'LESION', motivo: 'Esguince de rodilla', gravedad: 'MODERADA', esClave: true },
      { jugador: 'José Amo', posicion: 'DEF', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado', gravedad: 'CRITICA', esClave: false }
    ]
  },
  'Castellón': {
    sistema: '3-4-3',
    entrenador: 'Dick Schreuder',
    titulares: [
      { nombre: 'Gonzalo Crettaz', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Daijiro Chirino', dorsal: 14, posicion: 'DEF', esClave: true },
      { nombre: 'Alberto Jiménez', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Jetro Willems', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Kenneth Mamah', dorsal: 7, posicion: 'MED' },
      { nombre: 'Thomas van den Belt', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Óscar Gil', dorsal: 4, posicion: 'MED' },
      { nombre: 'Douglas Aurélio', dorsal: 11, posicion: 'MED' },
      { nombre: 'Raúl Sánchez', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Kenneth Obinna', dorsal: 19, posicion: 'DEL' },
      { nombre: 'Jesús De Miguel', dorsal: 9, posicion: 'DEL', esCapitan: true, esClave: true }
    ],
    suplentes: ['Brian Schwake', 'Tin Jost', 'Salva Ruiz', 'Josep Calavera', 'Mats Seuntjens', 'Álex Calatrava', 'Brian Cipenga', 'Pere Marco'],
    bajasHabituales: [
      { jugador: 'Albert Lottin', posicion: 'MED', tipo: 'LESION', motivo: 'Lesión muscular', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Burgos': {
    sistema: '4-4-2',
    entrenador: 'Luis Miguel Ramis',
    titulares: [
      { nombre: 'Ander Cantero', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Anderson Arroyo', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Aitor Córdoba', dorsal: 4, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Lisandro López', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Florian Miguel', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Álex Sancris', dorsal: 7, posicion: 'MED', esClave: true },
      { nombre: 'Miguel Atienza', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'David González', dorsal: 14, posicion: 'MED' },
      { nombre: 'Íñigo Córdoba', dorsal: 11, posicion: 'MED' },
      { nombre: 'Curro Sánchez', dorsal: 10, posicion: 'DEL', esClave: true },
      { nombre: 'Fer Niño', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Loïc Badiashile', 'Pipa', 'Raúl Navarro', 'Iván Morante', 'Borja Sánchez', 'Dani Ojeda', 'Edu Espiau'],
    bajasHabituales: [
      { jugador: 'Kevin Appin', posicion: 'MED', tipo: 'LESION', motivo: 'Rotura de ligamento cruzado anterior', gravedad: 'CRITICA', esClave: true }
    ]
  },
  'Albacete': {
    sistema: '4-4-2',
    entrenador: 'Alberto González',
    titulares: [
      { nombre: 'Raúl Lizoain', dorsal: 13, posicion: 'POR' },
      { nombre: 'Álvaro Rodríguez', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Jon García', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Lalo Aguilar', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Juan María Alcedo', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Agus Medina', dorsal: 8, posicion: 'MED', esClave: true },
      { nombre: 'Riki Rodríguez', dorsal: 6, posicion: 'MED', esCapitan: true, esClave: true },
      { nombre: 'José Carlos Lazo', dorsal: 11, posicion: 'MED' },
      { nombre: 'Juanma García', dorsal: 7, posicion: 'MED', esClave: true },
      { nombre: 'Alberto Quiles', dorsal: 21, posicion: 'DEL', esClave: true },
      { nombre: 'Higinio Marín', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Cristian Rivero', 'Diego González', 'Javi Villar', 'Rai Marchán', 'Antonio Pacheco', 'Fidel Chaves', 'Nabil Touaizi'],
    bajasHabituales: [
      { jugador: 'Jaume Costa', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga en el sóleo', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Huesca': {
    sistema: '5-3-2',
    entrenador: 'Antonio Hidalgo',
    titulares: [
      { nombre: 'Dani Jiménez', dorsal: 13, posicion: 'POR', esClave: true },
      { nombre: 'Toni Abad', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Jeremy Blasco', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Jorge Pulido', dorsal: 14, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Rubén Pulido', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Ignasi Vilarrasa', dorsal: 20, posicion: 'DEF' },
      { nombre: 'Iker Kortajarena', dorsal: 18, posicion: 'MED' },
      { nombre: 'Óscar Sielva', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Javi Pérez', dorsal: 8, posicion: 'MED' },
      { nombre: 'Patrick Soko', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Sergi Enrich', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Juan Pérez', 'Diego González', 'Miguel Loureiro', 'Jordi Martín', 'Javi Mier', 'Hugo Vallejo', 'Iker Unzueta'],
    bajasHabituales: [
      { jugador: 'Joaquín Muñoz', posicion: 'DEL', tipo: 'DUDA', motivo: 'Microrrotura en el aductor', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Cartagena': {
    sistema: '4-4-2',
    entrenador: 'Jandro Castro',
    titulares: [
      { nombre: 'Pablo Campos', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Martín Aguirregabiria', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Kiko Olivas', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Pedro Alcalá', dorsal: 5, posicion: 'DEF', esCapitan: true, esClave: true },
      { nombre: 'Andrija Vukčević', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Damián Musto', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Andy Rodríguez', dorsal: 8, posicion: 'MED' },
      { nombre: 'Cedric Teguia', dorsal: 11, posicion: 'MED' },
      { nombre: 'Jairo Izquierdo', dorsal: 7, posicion: 'MED', esClave: true },
      { nombre: 'Luis Muñoz', dorsal: 10, posicion: 'DEL' },
      { nombre: 'Gastón Valles', dorsal: 9, posicion: 'DEL' }
    ],
    suplentes: ['Toni Fuidias', 'Jorge Moreno', 'Nikola Šipčić', 'Sergio Guerrero', 'Lucas Román', 'Hugo González', 'Alfredo Ortuño', 'Dani Escriche'],
    bajasHabituales: [
      { jugador: 'Gonzalo Verdú', posicion: 'DEF', tipo: 'LESION', motivo: 'Lesión meniscal', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Córdoba': {
    sistema: '4-2-3-1',
    entrenador: 'Iván Ania',
    titulares: [
      { nombre: 'Carlos Marín', dorsal: 1, posicion: 'POR', esCapitan: true, esClave: true },
      { nombre: 'Carlos Albarrán', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Adrián Lapeña', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Marvel', dorsal: 5, posicion: 'DEF' },
      { nombre: 'José Calderón', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Isma Ruiz', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Álex Sala', dorsal: 8, posicion: 'MED' },
      { nombre: 'Cristian Carracedo', dorsal: 7, posicion: 'DEL', esClave: true },
      { nombre: 'Jacobo González', dorsal: 10, posicion: 'MED', esClave: true },
      { nombre: 'Adilson Mendes', dorsal: 11, posicion: 'DEL' },
      { nombre: 'Antonio Casas', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Ramón Vila', 'Carlos Isaac', 'Mati Barboza', 'Xavi Sintes', 'Genaro Rodríguez', 'Theo Zidane', 'Jude Soonsup-Bell', 'Kuki Zalazar', 'Nikolay Obolskiy'],
    bajasHabituales: [
      { jugador: 'Carlos Isaac', posicion: 'DEF', tipo: 'DUDA', motivo: 'Molestias musculares', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Málaga': {
    sistema: '4-2-3-1',
    entrenador: 'Sergio Pellicer',
    titulares: [
      { nombre: 'Alfonso Herrero', dorsal: 1, posicion: 'POR', esCapitan: true, esClave: true },
      { nombre: 'Carlos Puga', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Nélson Monte', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Einar Galilea', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Dani Sánchez', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Luismi Sánchez', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Manu Molina', dorsal: 8, posicion: 'MED' },
      { nombre: 'Antonio Cordero', dorsal: 26, posicion: 'DEL', esClave: true },
      { nombre: 'Aarón Ochoa', dorsal: 27, posicion: 'MED' },
      { nombre: 'Kevin Medina', dorsal: 11, posicion: 'DEL' },
      { nombre: 'Dioni Villalba', dorsal: 17, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Carlos López', 'Álex Pastor', 'Víctor García', 'Izan Merino', 'Juanpe', 'Yanis Rahmani', 'David Larrubia', 'Roko Baturina'],
    bajasHabituales: [
      { jugador: 'Ramón Enríquez', posicion: 'MED', tipo: 'DUDA', motivo: 'Molestias musculares', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Eldense': {
    sistema: '4-4-2',
    entrenador: 'Dani Ponz',
    titulares: [
      { nombre: 'Ian Mackay', dorsal: 1, posicion: 'POR' },
      { nombre: 'Fran Gámez', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Dario Đumić', dorsal: 5, posicion: 'DEF', esClave: true },
      { nombre: 'Íñigo Piña', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Marc Mateu', dorsal: 3, posicion: 'DEF', esClave: true },
      { nombre: 'Víctor García', dorsal: 7, posicion: 'MED' },
      { nombre: 'Sergio Ortuño', dorsal: 8, posicion: 'MED', esCapitan: true, esClave: true },
      { nombre: 'David Timor', dorsal: 6, posicion: 'MED' },
      { nombre: 'Iván Chapela', dorsal: 11, posicion: 'MED', esClave: true },
      { nombre: 'Juanto Ortuño', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Alex Bernal', dorsal: 10, posicion: 'DEL' }
    ],
    suplentes: ['Dani Martín', 'Monsalve', 'Iván Martos', 'Nacho Quintana', 'Simo Bouzaidi', 'Jorquera', 'Sixtus Ogbuehi'],
    bajasHabituales: [
      { jugador: 'Víctor Camarasa', posicion: 'MED', tipo: 'LESION', motivo: 'Recuperación articular rodilla', gravedad: 'MODERADA', esClave: false }
    ]
  },
  'Mirandés': {
    sistema: '5-3-2',
    entrenador: 'Alessio Lisci',
    titulares: [
      { nombre: 'Raúl Fernández', dorsal: 1, posicion: 'POR', esClave: true },
      { nombre: 'Hugo Rincón', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Juan Gutiérrez', dorsal: 4, posicion: 'DEF' },
      { nombre: 'Unai Egiluz', dorsal: 5, posicion: 'DEF' },
      { nombre: 'Pablo Tomeo', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Julio Alonso', dorsal: 21, posicion: 'DEF' },
      { nombre: 'Jon Gorrotxategi', dorsal: 6, posicion: 'MED', esClave: true },
      { nombre: 'Alberto Reina', dorsal: 8, posicion: 'MED', esCapitan: true },
      { nombre: 'Mathis Lachuer', dorsal: 10, posicion: 'MED' },
      { nombre: 'Joaquín Panichelli', dorsal: 9, posicion: 'DEL', esClave: true },
      { nombre: 'Urko Izeta', dorsal: 19, posicion: 'DEL' }
    ],
    suplentes: ['Luis López', 'Víctor Parada', 'Sergio Postigo', 'Álex Calvo', 'Santiago Homenchenko', 'Ander Martín', 'Joel Roca'],
    bajasHabituales: [
      { jugador: 'Sergio Postigo', posicion: 'DEF', tipo: 'DUDA', motivo: 'Sobrecarga muscular', gravedad: 'LEVE', esClave: false }
    ]
  },
  'Racing Ferrol': {
    sistema: '4-2-3-1',
    entrenador: 'Cristóbal Parralo',
    titulares: [
      { nombre: 'Jesús Ruiz', dorsal: 1, posicion: 'POR' },
      { nombre: 'Julián Delmás', dorsal: 2, posicion: 'DEF' },
      { nombre: 'Aleksa Puric', dorsal: 4, posicion: 'DEF', esClave: true },
      { nombre: 'Naldo', dorsal: 5, posicion: 'DEF', esClave: true },
      { nombre: 'Moi Delgado', dorsal: 3, posicion: 'DEF' },
      { nombre: 'Álvaro Sanz', dorsal: 6, posicion: 'MED' },
      { nombre: 'Josep Señé', dorsal: 8, posicion: 'MED', esCapitan: true, esClave: true },
      { nombre: 'Josué Dorrio', dorsal: 7, posicion: 'MED' },
      { nombre: 'Álex López', dorsal: 10, posicion: 'MED' },
      { nombre: 'Bebé', dorsal: 11, posicion: 'DEL', esClave: true },
      { nombre: 'Eneko Jauregi', dorsal: 9, posicion: 'DEL', esClave: true }
    ],
    suplentes: ['Yoel Rodríguez', 'David Castro', 'Rober Correa', 'Brais Martínez', 'Fran Manzanara', 'Luis Perea', 'Manu Vallejo', 'Álvaro Giménez', 'Chiki'],
    bajasHabituales: [
      { jugador: 'Erick Cabaco', posicion: 'DEF', tipo: 'LESION', motivo: 'Lesión de larga duración', gravedad: 'CRITICA', esClave: false }
    ]
  }
};
