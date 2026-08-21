"""Lectura de los datos impresos en la credencial del INE.

Solo se extrae lo necesario para cotejar contra la CURP declarada. El texto
vive en memoria y se descarta al responder.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass

import numpy as np
from PIL import Image

_ocr = None


def _cargar():
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(use_angle_cls=True, lang="es", show_log=False)
    return _ocr


CURP_EN_TEXTO = re.compile(r"\b[A-Z]{4}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d\b")
FECHA = re.compile(r"\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b")


@dataclass
class DatosINE:
    curp: str | None
    nacimiento: str | None
    texto_detectado: bool


def leer(imagen: bytes) -> DatosINE:
    ocr = _cargar()
    img = Image.open(io.BytesIO(imagen)).convert("RGB")
    if max(img.size) > 2000:
        img.thumbnail((2000, 2000))

    resultado = ocr.ocr(np.asarray(img), cls=True)
    piezas: list[str] = []
    for bloque in resultado or []:
        for linea in bloque or []:
            if linea and len(linea) > 1 and linea[1]:
                piezas.append(str(linea[1][0]).upper())

    texto = " ".join(piezas)
    # El OCR confunde O con 0 e I con 1 en las credenciales; se normaliza antes
    # de buscar la CURP, que es la parte con formato estricto.
    limpio = texto.replace(" ", "")

    curp = None
    for candidato in (limpio, limpio.replace("O", "0").replace("I", "1")):
        m = CURP_EN_TEXTO.search(candidato)
        if m:
            curp = m.group(0)
            break

    f = FECHA.search(texto)
    nacimiento = f"{f.group(3)}-{f.group(2)}-{f.group(1)}" if f else None

    return DatosINE(curp=curp, nacimiento=nacimiento, texto_detectado=bool(piezas))
