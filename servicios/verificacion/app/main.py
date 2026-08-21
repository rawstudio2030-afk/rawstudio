"""Servicio de verificación de edad e identidad — RAWstudio.

Corre aparte del sitio porque GitHub Pages sirve estáticos y esto necesita
Python con modelos de visión. Pensado para Railway, Render o Hugging Face
Spaces.

PRINCIPIO QUE ORDENA TODO EL SERVICIO: las imágenes se procesan en memoria y
jamás se escriben a disco ni se envían a Supabase. Lo único que sale de aquí es
un booleano de mayoría de edad y la fecha. Son datos biométricos —sensibles
según la LFPDPPP— y lo que no se guarda no se puede filtrar, ni robar, ni
entregar por requerimiento.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timezone

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .curp import analizar
from .geo import ip_del_cliente, ubicar

MAX_BYTES = int(os.getenv("MAX_IMAGEN_MB", "8")) * 1024 * 1024
ORIGENES = [o.strip() for o in os.getenv(
    "ORIGENES_PERMITIDOS", "https://rawstudio.biz,http://localhost:4173"
).split(",") if o.strip()]

app = FastAPI(
    title="RAWstudio · Verificación",
    description="Verificación de edad e identidad. No persiste imágenes.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/salud")
async def salud():
    return {"ok": True, "persiste_imagenes": False}


@app.get("/ubicacion")
async def donde_estoy(request: Request):
    ip = ip_del_cliente(request.headers, request.client.host if request.client else None)
    u = await ubicar(ip)
    return {"permitido": u.permitido, "pais": u.pais, "motivo": u.motivo}


@app.post("/verificar")
async def verificar(
    request: Request,
    curp: str = Form(...),
    ine: UploadFile = File(...),
    selfie: UploadFile = File(...),
):
    ip = ip_del_cliente(request.headers, request.client.host if request.client else None)
    geo = await ubicar(ip)
    if not geo.permitido:
        return JSONResponse(status_code=451, content={
            "ok": False, "paso": "geo", "motivo": geo.motivo,
        })

    # 1 · La CURP sola ya determina la edad. Se valida primero porque es
    #     instantaneo: no tiene sentido correr modelos de vision si el dato
    #     basico no cuadra.
    r = analizar(curp)
    if not r.valida:
        return JSONResponse(status_code=422, content={
            "ok": False, "paso": "curp", "motivo": r.motivo,
        })
    if not r.mayor_de_edad:
        return JSONResponse(status_code=403, content={
            "ok": False, "paso": "edad",
            "motivo": "La CURP indica que eres menor de edad",
        })

    datos_ine = await ine.read()
    datos_selfie = await selfie.read()
    if len(datos_ine) > MAX_BYTES or len(datos_selfie) > MAX_BYTES:
        return JSONResponse(status_code=413, content={
            "ok": False, "paso": "tamaño",
            "motivo": f"Cada imagen debe pesar menos de {MAX_BYTES // 1048576} MB",
        })

    try:
        # 2 · La credencial debe contener la CURP declarada. Sin esto, alguien
        #     podria presentar una CURP ajena de un adulto con su propia selfie.
        from .ine import leer
        leido = leer(datos_ine)
        if leido.curp and leido.curp != curp.strip().upper():
            return JSONResponse(status_code=422, content={
                "ok": False, "paso": "ine",
                "motivo": "La CURP de la credencial no coincide con la que escribiste",
            })

        # 3 · Y la cara de la credencial debe ser la de la selfie.
        from .rostro import comparar
        cotejo = comparar(datos_ine, datos_selfie)
    finally:
        # Explicito aunque Python lo haria solo: deja constancia en el codigo de
        # que las imagenes no sobreviven a la peticion.
        del datos_ine, datos_selfie

    if not cotejo.coincide:
        return JSONResponse(status_code=422, content={
            "ok": False, "paso": "rostro",
            "motivo": cotejo.motivo or "El rostro no coincide con la credencial",
            "similitud": cotejo.similitud,
        })

    # Lo unico que sale del servicio.
    return {
        "ok": True,
        "mayor_de_edad": True,
        "verificado_en": datetime.now(timezone.utc).isoformat(),
        "similitud": cotejo.similitud,
        "curp_leida_del_ine": leido.curp is not None,
    }
