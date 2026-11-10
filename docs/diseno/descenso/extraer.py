#!/usr/bin/env python3
"""Extrae las imagenes embebidas como data URI a archivos normales.

Uso (desde esta carpeta):

    python3 extraer.py

Escribe:

    img/bar-hero.jpg, img/stairs.jpg, img/club.jpg, img/camara.jpg,
    img/puerta.jpg, img/grain.png, img/thumb-1.jpg ... img/thumb-6.jpg
    nivel1.jpg ... nivel4.jpg, movil.jpg, antes-despues.jpg, desktop-full.jpg

Asi Claude puede copiar los fondos a public/descenso/ y comparar capturas
sin decodificar a mano. index.html y capturas.html siguen funcionando
solos (llevan las imagenes embebidas) si no se corre este script.
"""
from __future__ import annotations

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

IMG_SRC = re.compile(
    r'src="data:(?P<mime>image/[^;]+);base64,(?P<b64>[^"]+)"\s+data-asset="(?P<name>[^"]+)"'
)
CSS_DATA = re.compile(
    r'url\("data:(?P<mime>image/[^;]+);base64,(?P<b64>[^"]+)"\)\s*/\*\s*asset:(?P<name>[^ ]+)\s*\*/'
)


def write_asset(name: str, raw: bytes) -> None:
    dest = ROOT / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.read_bytes() == raw:
        print(f"ok    {name} (ya estaba)")
        return
    dest.write_bytes(raw)
    print(f"write {name}  {len(raw) // 1024}KB")


def extract_from(html_path: Path) -> int:
    if not html_path.exists():
        print(f"no esta {html_path.name}, se salta", file=sys.stderr)
        return 0
    text = html_path.read_text(encoding="utf-8")
    n = 0
    for m in IMG_SRC.finditer(text):
        write_asset(m.group("name"), base64.b64decode(m.group("b64")))
        n += 1
    for m in CSS_DATA.finditer(text):
        write_asset(m.group("name"), base64.b64decode(m.group("b64")))
        n += 1
    return n


def main() -> int:
    total = extract_from(ROOT / "index.html")
    total += extract_from(ROOT / "capturas.html")
    if total == 0:
        print("No se encontro ningun data URI con data-asset.", file=sys.stderr)
        return 1
    print(f"listo: {total} imagenes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
