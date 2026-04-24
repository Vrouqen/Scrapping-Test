# Scrapping-Test

Aplicación para consultar perfiles públicos de Instagram mediante scraping. El proyecto está dividido en dos partes:

- `backend`: API en Node.js + Express + Playwright para extraer datos del perfil, publicaciones recientes y estadísticas históricas.
- `frontend`: app en React Native con Expo para buscar perfiles y visualizar resultados en pestañas.

## Estructura

```text
backend/
	src/
		server.js
		routes/
			scrape.js
		scrapers/
			instagramScraper.js
frontend/
	App.js
	src/
		components/
		screens/
		theme.js
```

## Requisitos

- Node.js 18 o superior
- npm
- Chromium para Playwright
- Expo Go, emulador o navegador para ejecutar el frontend

## Backend

### Instalación

```bash
cd backend
npm install
npx playwright install chromium
```

### Ejecución

```bash
npm run dev
```

Por defecto el servidor corre en `http://localhost:4000`.

### Variables de entorno

El backend acepta estas variables opcionales:

- `PORT`: puerto del servidor. Por defecto usa `4000`.
- `HEADLESS`: si se define en `false`, abre el navegador visible.
- `INSTAGRAM_SESSIONID`: cookie de sesión para navegar con una sesión autenticada si la necesitas.
- `MAX_POSTS_SCROLL_ROUNDS`: número máximo de scrolls al recorrer publicaciones.
- `MAX_POSTS_STAGNANT_ROUNDS`: rondas sin novedades antes de detener el análisis histórico.
- `MAX_HISTORICAL_POSTS_TO_INSPECT`: límite de posts a inspeccionar en el análisis histórico.

### Endpoints

Base URL: `/api/scrape`

- `POST /instagram-profile`
	- Body: `{ "username": "usuario" }` o `{ "url": "https://instagram.com/usuario" }`
	- Devuelve datos del perfil y métricas básicas.

- `POST /instagram-posts`
	- Body: `{ "username": "usuario" }` o `{ "url": "https://instagram.com/usuario" }`
	- Devuelve publicaciones recientes con likes, comentarios, imagen y fecha.

- `POST /instagram-stats`
	- Body: `{ "username": "usuario" }` o `{ "url": "https://instagram.com/usuario" }`
	- Devuelve estadísticas históricas de los últimos 12 meses.

- `GET /health`
	- Verifica que el servicio esté levantado.

### Respuestas y errores

- `400`: falta `username` o `url` en el body.
- `404`: no se encontraron publicaciones públicas o el perfil no es accesible.
- `422`: el perfil no tiene suficientes publicaciones para el análisis histórico.

## Frontend

### Instalación

```bash
cd frontend
npm install
```

### Configuración

El frontend usa la variable `EXPO_PUBLIC_API_URL` para apuntar al backend.

Ejemplo:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api/scrape
```

En desarrollo, asegúrate de usar la URL correcta según el dispositivo:

- Android/iOS físico: usa la IP de tu máquina o un túnel público.
- Web: `http://localhost:4000/api/scrape` funciona si el backend está local.

### Ejecución

```bash
npx expo start
```

También puedes usar:

```bash
npx expo start --web
```

## Flujo de uso

1. Levanta el backend.
2. Configura `EXPO_PUBLIC_API_URL` en el frontend.
3. Abre la app y ve a la pestaña `Buscar`.
4. Ingresa un `username` o la URL del perfil.
5. Revisa los datos en las pestañas `Perfil`, `Galería` y `Analitics`.

## Notas

- El proyecto está pensado para perfiles públicos.
- El análisis histórico requiere al menos 3 publicaciones.
- Si quieres exponer el backend en internet, puedes usar un túnel como `localtunnel` sobre el puerto `4000`.