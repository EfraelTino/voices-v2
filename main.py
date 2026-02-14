import re
import io
import json
import asyncio
import os
import edge_tts
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


# =============================================================
#  CONFIGURACIÓN
# =============================================================

DOMINIO = "voices-v2.onrender.com"
ORIGENES_PERMITIDOS = [
    f"https://{DOMINIO}",
    f"https://www.{DOMINIO}",
    f"https://voices-v2-production.up.railway.app/",
    # Descomenta SOLO para desarrollo local:
    "http://localhost:8000",
]
HOSTS_PERMITIDOS = [
    DOMINIO,
    f"www.{DOMINIO}",
    f"voices-v2-production.up.railway.app",
    # Descomenta para desarrollo local:
    "localhost",
]

MAX_CHARS = 2000
MAX_CONCURRENCIA_TTS = 5
TIMEOUT_COLA_SEGUNDOS = 30
RATE_LIMIT = "10/minute"


# =============================================================
#  APP + MIDDLEWARES
# =============================================================

app = FastAPI()

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Trusted Host
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=HOSTS_PERMITIDOS,
)

# Archivos estáticos y plantillas
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# =============================================================
#  SEMÁFORO DE CONCURRENCIA
# =============================================================

semaforo_tts = asyncio.Semaphore(MAX_CONCURRENCIA_TTS)


# =============================================================
#  BASE DE DATOS DE VOCES
# =============================================================
PATH_VOCES_JSON = "static/voces.json"

def cargar_voces():
    if os.path.exists(PATH_VOCES_JSON):
        with open(PATH_VOCES_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

VOCES_CATALOGO = cargar_voces()
# =============================================================
#  FUNCIÓN DE SEGURIDAD
# =============================================================

def parece_codigo(texto: str) -> bool:
    if re.search(r"[<>{}\[\]\\]", texto):
        return True
    patrones = [
        r"function\s*\(", r"console\.log", r"alert\(",
        r"import\s+", r"class\s+\w+", r"return\s+;"
    ]
    for p in patrones:
        if re.search(p, texto):
            return True
    return False


# =============================================================
#  RUTAS
# =============================================================
# --- 1. CONFIGURACIÓN Y CARGA DE DATOS ---
VOCES_JSON_PATH = "static/voces.json"

def cargar_voces():
    try:
        with open(VOCES_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error cargando JSON: {e}")
        return {}

# Esta variable debe estar aquí, a nivel de "piso" del archivo
VOCES_GLOBAL = cargar_voces()

# --- 2. RUTA PRINCIPAL ---
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    ids_populares = [
        "es-MX-DaliaNeural", 
        "es-ES-AlvaroNeural", 
        "es-CO-GonzaloNeural", 
        "es-AR-TomasNeural"
    ]
    
    voces_populares = {id_v: VOCES_GLOBAL[id_v] for id_v in ids_populares if id_v in VOCES_GLOBAL}

    # IMPORTANTE: Asegúrate de guardar el archivo main.py después de editar
    return templates.TemplateResponse("index.html", {
        "request": request,
        "voces_populares": voces_populares, 
        "todas_las_voces": VOCES_GLOBAL  
    })

@app.get("/voices", response_class=HTMLResponse)
async def get_voces(request: Request):
    # Agrupamos por país usando los datos del JSON
    voces_por_pais = {}
    
    for id_voz, info in VOCES_CATALOGO.items():
        # Usamos el nombre del país que ya viene en el JSON
        pais_nombre = info.get('pais_nombre', f"Español ({info['pais']})")
        
        if pais_nombre not in voces_por_pais:
            voces_por_pais[pais_nombre] = []
        
        # Insertamos el ID en el dict para que el HTML lo use
        voz_con_id = info.copy()
        voz_con_id['id'] = id_voz
        
        voces_por_pais[pais_nombre].append(voz_con_id)

    return templates.TemplateResponse("voices.html", {
        "request": request, 
        "voces": VOCES_CATALOGO,           # Para el contador total
        "paises": voces_por_pais.keys(),    # Para el contador de países
        "voces_por_pais": voces_por_pais   # Para el bucle principal de tarjetas
    })

@app.post("/generar")
@limiter.limit(RATE_LIMIT)
async def generar_audio(
    request: Request,
    text: str,
    voice: str,
    rate: str = "+0%",
    pitch: str = "+0Hz",
):
    try:
        # Validaciones
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="El texto no puede estar vacío.")

        if len(text) > MAX_CHARS:
            raise HTTPException(status_code=400, detail=f"Texto demasiado largo ({len(text)}/{MAX_CHARS}).")

        if parece_codigo(text):
            print(f"Intento de inyección bloqueado: {text}")
            raise HTTPException(status_code=400, detail="No se permite enviar código, etiquetas HTML (< >) o llaves ({ }). Escribe solo texto natural.")

        # --- CAMBIO AQUÍ: Usamos VOCES_GLOBAL en lugar de VOCES_DATA ---
        if voice not in VOCES_GLOBAL:
            raise HTTPException(status_code=400, detail="Voz no válida.")

        # Control de concurrencia
        adquirido = False
        try:
            await asyncio.wait_for(
                semaforo_tts.acquire(),
                timeout=TIMEOUT_COLA_SEGUNDOS,
            )
            adquirido = True

            # Generación
            comunicador = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            audio_stream = io.BytesIO()

            async for chunk in comunicador.stream():
                if chunk["type"] == "audio":
                    audio_stream.write(chunk["data"])

            audio_stream.seek(0)
            return StreamingResponse(audio_stream, media_type="audio/mpeg")

        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=503,
                detail="El servidor está ocupado. Intenta de nuevo en unos segundos.",
            )
        finally:
            if adquirido:
                semaforo_tts.release()

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error crítico en backend: {e}")
        return Response(content=f"Error interno del servidor: {str(e)}", status_code=500)
@app.get("/terminos", response_class=HTMLResponse)
async def terminos(request: Request):
    return templates.TemplateResponse("terminos.html", {"request": request})
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "slots_disponibles": semaforo_tts._value,
        "max_concurrencia": MAX_CONCURRENCIA_TTS,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)