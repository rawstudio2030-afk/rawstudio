#!/usr/bin/env python3
"""Extrae las imagenes (y el bucle de fuego) embebidas como data URI.

Uso (desde esta carpeta):

    python3 extraer.py

Escribe en img/ los assets que Claude copia a public/descenso/
(reja, antorcha, losa, darkroom, fuego-loop, etc.) y las capturas
(transicion-1.jpg …) al lado de este script. index.html y capturas.html
siguen funcionando solos (llevan las imagenes embebidas) si no se corre.
"""
from __future__ import annotations

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

IMG_SRC = re.compile(
    r'(?:src|poster)="data:(?P<mime>[^;]+);base64,(?P<b64>[^"]+)"\s+data-asset="(?P<name>[^"]+)"'
)
CSS_DATA = re.compile(
    r'url\("data:(?P<mime>[^;]+);base64,(?P<b64>[^"]+)"\)\s*/\*\s*asset:(?P<name>[^ ]+)\s*\*/'
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
    seen: set[str] = set()
    for rx in (IMG_SRC, CSS_DATA):
        for m in rx.finditer(text):
            name = m.group("name")
            if name in seen:
                continue
            seen.add(name)
            write_asset(name, base64.b64decode(m.group("b64")))
            n += 1
    return n


def main() -> int:
    total = extract_from(ROOT / "index.html")
    total += extract_from(ROOT / "capturas.html")
    if total == 0:
        print("No se encontro ningun data URI con data-asset.", file=sys.stderr)
        return 1
    print(f"listo: {total} archivos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
