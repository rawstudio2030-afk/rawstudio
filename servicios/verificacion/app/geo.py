"""Geobloqueo por IP.

Advertencia honesta: esto NO es un control de acceso. Una VPN lo salta en un
minuto y cuesta unos pesos. Sirve como señal de cumplimiento —demuestra
intencion de restringir por territorio— y para reducir trafico casual de fuera,
no para impedir el acceso de quien se lo propone.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

PAISES_PERMITIDOS = {
    p.strip().upper()
    for p in os.getenv("PAISES_PERMITIDOS", "MX").split(",")
    if p.strip()
}
GEO_ACTIVO = os.getenv("GEO_ACTIVO", "true").lower() == "true"


@dataclass
class Ubicacion:
    permitido: bool
    pais: str | None
    motivo: str | None = None


def ip_del_cliente(headers, cliente_directo: str | None) -> str | None:
    # Detras de Railway, Render o Hugging Face la IP real llega en cabecera; la
    # del socket seria la del proxy.
    for cabecera in ("cf-connecting-ip", "x-real-ip", "x-forwarded-for"):
        v = headers.get(cabecera)
        if v:
            return v.split(",")[0].strip()
    return cliente_directo


async def ubicar(ip: str | None) -> Ubicacion:
    if not GEO_ACTIVO:
        return Ubicacion(True, None, "geobloqueo desactivado")
    if not ip:
        return Ubicacion(False, None, "No se pudo determinar la ubicación")
    if ip.startswith(("127.", "10.", "192.168.", "172.16.")) or ip == "::1":
        return Ubicacion(True, None, "red local")

    try:
        async with httpx.AsyncClient(timeout=4.0) as c:
            r = await c.get(f"https://ipapi.co/{ip}/country/")
            pais = r.text.strip().upper()
    except Exception:
        # Si el servicio de geolocalizacion falla, se deja pasar: negar el
        # acceso por una caida ajena castiga a usuarias legitimas, y el
        # geobloqueo no es la barrera de seguridad de todos modos.
        return Ubicacion(True, None, "no se pudo verificar; se permite")

    if len(pais) != 2:
        return Ubicacion(True, None, "respuesta inesperada; se permite")

    return Ubicacion(
        pais in PAISES_PERMITIDOS, pais,
        None if pais in PAISES_PERMITIDOS else f"El servicio no está disponible en {pais}",
    )
