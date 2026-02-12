import soundfile as sf
from kokoro_onnx import Kokoro
import os
import time

# --- CONFIGURACIÓN ---
MODEL_PATH = "kokoro-v0_19.onnx"
VOICES_PATH = "voices-v1.0.bin"
CARPETA_SALIDA = "muestras_voces"

# Texto neutro para probar la dicción
TEXTO_PRUEBA = """
Hola. Esta es una prueba de mi voz para tu canal de misterio.
¿Crees que tengo la autoridad necesaria?
"""

# 1. Crear carpeta de salida si no existe
if not os.path.exists(CARPETA_SALIDA):
    os.makedirs(CARPETA_SALIDA)

# 2. Cargar el modelo
if not os.path.exists(MODEL_PATH) or not os.path.exists(VOICES_PATH):
    print("❌ Error: Faltan archivos del modelo (.onnx o .bin)")
    exit()

print("🧠 Cargando modelo (esto solo pasa una vez)...")
kokoro = Kokoro(MODEL_PATH, VOICES_PATH)

# 3. Obtener todas las voces disponibles
voces_disponibles = sorted(list(kokoro.get_voices()))
total_voces = len(voces_disponibles)

print(f"\n📋 Se encontraron {total_voces} voces. Iniciando casting...\n")
print("-" * 50)

# 4. Bucle secuencial (Uno por uno)
for i, nombre_voz in enumerate(voces_disponibles):
    archivo_salida = f"{CARPETA_SALIDA}/{nombre_voz}.wav"
    
    print(f"🎙️ [{i+1}/{total_voces}] Generando voz: {nombre_voz} ...", end="")
    
    try:
        # Generamos el audio
        # lang="es" fuerza a que intenten hablar español
        samples, sample_rate = kokoro.create(
            TEXTO_PRUEBA, 
            voice=nombre_voz, 
            speed=1.0, 
            lang="es"
        )
        
        # Guardamos el archivo
        sf.write(archivo_salida, samples, sample_rate)
        print(" ✅ Listo.")
        
    except Exception as e:
        print(f" ❌ Error: {e}")

    # Pequeña pausa para dejar respirar al procesador (opcional)
    time.sleep(0.5)

print("-" * 50)
print(f"🎉 ¡Casting finalizado! Revisa la carpeta '{CARPETA_SALIDA}'")