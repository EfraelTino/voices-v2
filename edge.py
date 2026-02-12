import asyncio
import edge_tts
import os
import json

# --- CONFIGURACIÓN DE RUTAS ---
CARPETA_AUDIOS = "static/casting"
ARCHIVO_JSON = "static/voces.json"

TEXTO_PRUEBA = """
Esta es una prueba de voz para Voceape. 
¿Sabías que el 90% de tus problemas existen solo en tu imaginación?
La realidad es mucho más simple.
"""

# Mapeo de banderas para el JSON
BANDERAS = {
    "AR": "🇦🇷", "MX": "🇲🇽", "CO": "🇨🇴", "ES": "🇪🇸", "US": "🇺🇸", 
    "PE": "🇵🇪", "CL": "🇨🇱", "VE": "🇻🇪", "UY": "🇺🇾", "PY": "🇵🇾", 
    "EC": "🇪🇨", "BO": "🇧🇴", "GT": "🇬🇹", "HN": "🇭🇳", "SV": "🇸🇻", 
    "NI": "🇳🇮", "CR": "🇨🇷", "PA": "🇵🇦", "DO": "🇩🇴", "PR": "🇵🇷", "CU": "🇨🇺"
}

async def main():
    # 1. Asegurar que las carpetas existan
    if not os.path.exists(CARPETA_AUDIOS):
        os.makedirs(CARPETA_AUDIOS)
        print(f"✅ Carpeta creada: {CARPETA_AUDIOS}")

    print("🔍 Conectando con Microsoft para listar voces...")
    
    # 2. Obtener voces
    todas_las_voces = await edge_tts.list_voices()
    voces_espanol = [v for v in todas_las_voces if v['ShortName'].startswith("es-")]
    
    total = len(voces_espanol)
    data_json = {} # Diccionario que guardaremos como JSON

    print(f"📋 Se encontraron {total} voces. Iniciando proceso...\n" + "-"*60)

    # 3. Generar Audios y Estructura Data
    for i, voz in enumerate(voces_espanol):
        short_name = voz['ShortName']
        genero = voz['Gender']
        partes = short_name.split("-")
        
        # Extraer info
        pais_code = partes[1].upper() if len(partes) > 1 else "ES"
        nombre_limpio = partes[2].replace("Neural", "") if len(partes) > 2 else short_name
        
        archivo_relativo = f"static/casting/{short_name}.mp3"
        
        # Llenar el diccionario
        data_json[short_name] = {
            "nombre": nombre_limpio,
            "pais": pais_code,
            "bandera": BANDERAS.get(pais_code, "🌐"),
            "genero": genero,
            "demo": f"/{archivo_relativo}", # Ruta que usará el navegador
            "desc": f"Voz {genero} de {pais_code}"
        }

        print(f"🎙️ [{i+1}/{total}] Procesando: {short_name}...", end="")

        try:
            # Solo descargar si no existe para no gastar recursos
            if not os.path.exists(archivo_relativo):
                comunicador = edge_tts.Communicate(text=TEXTO_PRUEBA, voice=short_name)
                await comunicador.save(archivo_relativo)
                print(" ✅ Generado")
            else:
                print(" ⏭️ Saltado (ya existe)")
                
        except Exception as e:
            print(f" ❌ Error: {e}")

        # Pausa breve para evitar bloqueos
        await asyncio.sleep(0.1)

    # 4. Guardar el archivo JSON final
    try:
        with open(ARCHIVO_JSON, 'w', encoding='utf-8') as f:
            json.dump(data_json, f, indent=4, ensure_ascii=False)
        print("-" * 60)
        print(f"🎉 ¡ÉXITO! Se han generado los audios y el archivo: {ARCHIVO_JSON}")
    except Exception as e:
        print(f"❌ Error al guardar el JSON: {e}")

if __name__ == "__main__":
    asyncio.run(main())