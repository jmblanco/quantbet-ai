# QuantBet AI Platform ⚽🎯

Plataforma analítica y predictiva de **La Quiniela 1X2**, combinando modelos probabilísticos (Dixon-Coles & Poisson), detección de sesgos en los porcentajes de juego (Expected Value) y motor combinatorio de reducciones con exportador estándar `.QUI`.

El proyecto es **100% autocontenido para uso local**. No depende de ninguna infraestructura externa, ni redes compartidas ni servicios en la nube.

---

## 🚀 Arranque en Local

### Opción A: Mediante Docker Compose (Recomendado)
Levanta todo el stack local (Frontend, Backend, PostgreSQL y Valkey) con un solo comando:

```bash
docker compose up -d --build
```

Una vez levantado:
- **Plataforma Web**: [http://localhost:8080](http://localhost:8080)
- **API Swagger / Documentación**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Estado del Sistema**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

Para detener los contenedores:
```bash
docker compose down
```

---

### Opción B: Mediante Dockhand en tu equipo
Si gestionas tus contenedores con **Dockhand** (o Portainer) en tu máquina u otra máquina de tu red local:

1. Ve a **Stacks** -> **Add Stack**.
2. Dale nombre (ej. `quantbet-ai`).
3. Elige la carpeta del proyecto o pega el contenido de `docker-compose.yml`.
4. Pulsa **Deploy / Start**.
5. Accede a `http://<IP-DE-ESE-EQUIPO>:8080`.

---

## 💻 Desarrollo Local (Sin Docker)

Si quieres ejecutar el código directamente en tu terminal con recarga rápida:

### 1. Levantar solo Base de Datos y Caché
```bash
docker compose up -d postgres valkey
```

### 2. Backend
```bash
cd services/backend
npm install
npm test            # Tests unitarios con Vitest
npm run seed        # Carga datos de prueba de la jornada
npm run dev         # Servidor Fastify en http://localhost:3333
```

### 3. Frontend
```bash
cd services/frontend
npm install
npm run dev         # Servidor Vite en http://localhost:5173
```

---

## 📁 Estructura del Repositorio

```text
quiniela-ia-platform/
├── docker-compose.yml          # Stack local completo (Frontend, Backend, Postgres, Valkey)
├── .env.example                # Variables de entorno por defecto
├── services/
│   ├── backend/                # API Fastify, Prisma, Poisson, Dixon-Coles, EV
│   │   ├── Dockerfile          # Imagen Node 22 Alpine + auto-migración Prisma
│   │   └── src/
│   └── frontend/               # SPA Vue 3 + Tailwind CSS
│       ├── Dockerfile          # Servido por Nginx Alpine (proxy a /api)
│       └── nginx.conf          # Configuración Nginx local
```
