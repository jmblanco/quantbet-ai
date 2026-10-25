-- CreateEnum
CREATE TYPE "EstadoJornada" AS ENUM ('PROGRAMADA', 'EN_JUEGO', 'FINALIZADA');

-- CreateTable
CREATE TABLE "Juego" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Juego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temporada" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jornada" (
    "id" TEXT NOT NULL,
    "juegoId" TEXT NOT NULL,
    "temporadaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaCierre" TIMESTAMP(3) NOT NULL,
    "bote" DECIMAL(12,2),
    "recaudacion" DECIMAL(12,2),
    "estado" "EstadoJornada" NOT NULL DEFAULT 'PROGRAMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partido" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "numeroCasilla" INTEGER NOT NULL,
    "equipoLocal" TEXT NOT NULL,
    "equipoVisitante" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3),
    "golesLocal" INTEGER,
    "golesVisitante" INTEGER,
    "resultadoSigno" TEXT,
    "pctApostadoLae1" DECIMAL(5,2),
    "pctApostadoLaeX" DECIMAL(5,2),
    "pctApostadoLae2" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrediccionIa" (
    "id" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "modeloVersion" TEXT NOT NULL,
    "prob1" DECIMAL(5,4) NOT NULL,
    "probX" DECIMAL(5,4) NOT NULL,
    "prob2" DECIMAL(5,4) NOT NULL,
    "ev1" DECIMAL(6,3) NOT NULL,
    "evX" DECIMAL(6,3) NOT NULL,
    "ev2" DECIMAL(6,3) NOT NULL,
    "recomendacionSigno" TEXT NOT NULL,
    "confianzaScore" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrediccionIa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrutinio" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "acertantes" INTEGER NOT NULL,
    "premioUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Escrutinio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReduccionGuardada" (
    "id" TEXT NOT NULL,
    "jornadaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoGarantia" TEXT NOT NULL,
    "numeroTriples" INTEGER NOT NULL,
    "numeroDobles" INTEGER NOT NULL,
    "numeroApuestas" INTEGER NOT NULL,
    "costeTotal" DECIMAL(8,2) NOT NULL,
    "combinaciones" JSONB NOT NULL,
    "archivoQui" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReduccionGuardada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Juego_codigo_key" ON "Juego"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Temporada_codigo_key" ON "Temporada"("codigo");

-- CreateIndex
CREATE INDEX "Jornada_fechaCierre_idx" ON "Jornada"("fechaCierre");

-- CreateIndex
CREATE UNIQUE INDEX "Jornada_juegoId_temporadaId_numero_key" ON "Jornada"("juegoId", "temporadaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Partido_jornadaId_numeroCasilla_key" ON "Partido"("jornadaId", "numeroCasilla");

-- CreateIndex
CREATE INDEX "PrediccionIa_partidoId_modeloVersion_idx" ON "PrediccionIa"("partidoId", "modeloVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Escrutinio_jornadaId_categoria_key" ON "Escrutinio"("jornadaId", "categoria");

-- AddForeignKey
ALTER TABLE "Jornada" ADD CONSTRAINT "Jornada_juegoId_fkey" FOREIGN KEY ("juegoId") REFERENCES "Juego"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jornada" ADD CONSTRAINT "Jornada_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "Jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrediccionIa" ADD CONSTRAINT "PrediccionIa_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrutinio" ADD CONSTRAINT "Escrutinio_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "Jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReduccionGuardada" ADD CONSTRAINT "ReduccionGuardada_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "Jornada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
