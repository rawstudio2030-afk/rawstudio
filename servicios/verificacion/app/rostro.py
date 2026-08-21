"""Cotejo facial entre la foto del INE y la selfie.

Las imagenes se procesan EN MEMORIA y nunca tocan disco. Es una decision de
diseño, no una optimizacion: son datos biometricos, que la ley mexicana
(LFPDPPP) clasifica como sensibles, y lo que no se guarda no se puede filtrar.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image

# El modelo se carga una vez al arrancar, no por peticion: cargarlo por
# peticion agregaria segundos a cada verificacion.
_modelo = None


def _cargar():
    global _modelo
    if _modelo is None:
        from insightface.app import FaceAnalysis
        _modelo = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _modelo.prepare(ctx_id=-1, det_size=(640, 640))
    return _modelo


def _a_arreglo(datos: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(datos)).convert("RGB")
    # Se limita el lado mayor: mas resolucion no mejora el cotejo y si dispara
    # el uso de memoria con fotos de camara moderna.
    if max(img.size) > 1600:
        img.thumbnail((1600, 1600))
    return np.asarray(img)[:, :, ::-1]  # RGB -> BGR


@dataclass
class Cotejo:
    coincide: bool
    similitud: float
    motivo: str | None = None


# Umbral sobre similitud coseno de los vectores de buffalo_l. 0.35 es
# deliberadamente conservador: preferimos rechazar a alguien legitimo —que
# puede reintentar— antes que aceptar a quien no es.
UMBRAL = 0.35


def comparar(ine: bytes, selfie: bytes, umbral: float = UMBRAL) -> Cotejo:
    modelo = _cargar()

    caras_ine = modelo.get(_a_arreglo(ine))
    if not caras_ine:
        return Cotejo(False, 0.0, "No se detectó un rostro en la credencial")

    caras_selfie = modelo.get(_a_arreglo(selfie))
    if not caras_selfie:
        return Cotejo(False, 0.0, "No se detectó un rostro en la selfie")
    if len(caras_selfie) > 1:
        # Varias caras en la selfie invalidan el cotejo: no se sabe cual es la
        # persona que dice ser.
        return Cotejo(False, 0.0, "Hay más de una persona en la selfie")

    # De la credencial se toma el rostro mas grande: suele ser la foto principal
    # y no la marca de agua ni el holograma.
    a = max(caras_ine, key=lambda c: (c.bbox[2] - c.bbox[0]) * (c.bbox[3] - c.bbox[1])).normed_embedding
    b = caras_selfie[0].normed_embedding

    similitud = float(np.dot(a, b))
    return Cotejo(similitud >= umbral, round(similitud, 4))
