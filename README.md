# Tutor IA — Energías Renovables

Herramienta de evaluación formativa con método socrático para alumnado de **Tecnología e Ingeniería (1.º de Bachillerato, Canarias)**, construida con Next.js (App Router, TypeScript), Tailwind CSS, componentes estilo shadcn/ui, Lucide React y el SDK oficial `@google/genai`.

## Características principales

- **Sin base de datos ni registro**: historial temporal únicamente en la memoria de la pestaña abierta.
- **Privacidad y seguridad**: comprobación previa de datos identificativos, bloqueo de alteración de reglas, límite de 10 MB en servidor, sin logs académicos ni caché persistente.
- **Integridad de la rúbrica oficial**: verificación SHA-256 en el servidor del archivo privado `private/rubric/Rúbrica memoria Renovables Gemini.pdf` (`corrector-energías-renovables-1º-bach-3`).
- **Dos modalidades**: revisión de documento completo en PDF (procesamiento nativo de Gemini) y revisión de fragmentos pegados, además de conversación socrática de seguimiento.

---

## 1. Cómo obtener tu clave `GEMINI_API_KEY` en Google AI Studio

1. Entra en [Google AI Studio](https://aistudio.google.com/) e inicia sesión con tu cuenta de Google.
2. En el menú lateral izquierdo (o superior), haz clic en **Get API key** (Obtener clave de API).
3. Pulsa **Create API key** y selecciona un proyecto de Google Cloud (o crea uno nuevo desde el propio asistente).
4. Copia la clave generada. **No la compartas ni la subas nunca a GitHub.**

---

## 2. Configuración local

1. Asegúrate de tener instalado **Node.js 20 o superior** (`node -v`). Si aún no lo tienes en Mac, puedes descargarlo desde [nodejs.org](https://nodejs.org/) o instalarlo con Homebrew (`brew install node`).
2. Instala las dependencias:

```bash
npm install
```

3. Crea el archivo `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

4. Edita `.env.local` y añade tu clave y modelo:

```env
GEMINI_API_KEY=tu_clave_real_de_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
RATE_LIMIT_MAX_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
```

> **Modelos recomendados**: `gemini-2.5-flash` (rápido y económico, compatible con PDF y salida JSON estructurada) o `gemini-2.5-pro` (análisis más profundo).

5. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

---

## 3. Publicar en GitHub

1. Inicializa el repositorio (si aún no está inicializado) y verifica que `.env.local` **no** aparece en `git status` (está protegido por `.gitignore`):

```bash
git init
git add .
git status
git commit -m "feat: primera versión de Tutor IA — Energías Renovables"
```

2. Crea un repositorio nuevo en GitHub (sin README ni `.gitignore` iniciales) y enlázalo:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

---

## 4. Desplegar en Vercel

1. Entra en [Vercel](https://vercel.com/) e importa tu repositorio de GitHub (**Add New... > Project**).
2. En **Environment Variables**, añade:
   - `GEMINI_API_KEY` = tu clave de Google AI Studio.
   - `GEMINI_MODEL` = `gemini-2.5-flash` (o el modelo elegido).
   - Opcional: `RATE_LIMIT_MAX_REQUESTS` = `20`, `RATE_LIMIT_WINDOW_MS` = `60000`.
3. Pulsa **Deploy**. Vercel compilará la aplicación Next.js y la dejará lista en producción manteniendo `GEMINI_API_KEY` y la rúbrica privada exclusivamente en el servidor.
