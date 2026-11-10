#!/usr/bin/env python3
"""Las imagenes de marca que se pintan FUERA de la aplicacion.

La vista previa de un enlace (og.png), los iconos del telefono y el logo que
mete Gmail en el correo de recuperacion. Tres sitios donde la marca la dibuja
un programa ajeno a partir de un archivo, no el CSS del sitio.

---------- Direccion: «El descenso» ----------

La marca es la de docs/diseno/descenso/README.md: «RAW» en una didona fina muy
espaciada y marfil, «studio» en cursiva champagne, sobre el navy de Collins.
Sin tubo de neon, sin resplandor, sin skyline. Los colores son los de
src/lib/diseño.ts (COLOR / PISO.collins); si cambian alli, cambian aqui.

---------- Tipografias ----------

El sitio usa Italiana (RAW) y Bodoni Moda italica (studio), de Google Fonts. En
esta maquina no estan, y Pillow solo dibuja con archivos locales: se usan Didot
(para RAW) y Bodoni 72 cursiva (para studio), que vienen con macOS y son de la
misma familia de didonas. Si algun dia hay que rehacer estas imagenes en otra
maquina, basta con apuntar RUTA_RAW / RUTA_STUDIO a las .ttf de Italiana y
Bodoni Moda; el resto del script no cambia.

---------- Por que Python y no un .mjs como los demas scripts ----------

Porque Pillow es el unico rasterizador que hay en esta maquina: no estan
rsvg-convert, ni inkscape, ni ImageMagick.

---------- Lo que la tarjeta NO lleva ----------

Contenido. Ni una portada, ni una miniatura, ni una silueta, ni una foto de
ambiente. Es la marca sobre su fondo y nada mas, y es deliberado: esa imagen la
va a pintar WhatsApp en una conversacion y X en una linea de tiempo, sin que
nadie la haya pedido y delante de quien pase por ahi. Una plataforma de
contenido adulto que mete su contenido en la vista previa se gana que el
enlace se marque, y de paso expone a quien lo comparte.

    python3 scripts/tarjetas-sociales.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'public'

# Los mismos de src/lib/diseño.ts. Si cambian alli, cambian aqui.
FONDO = (14, 21, 32)        # COLOR.fondo      #0E1520
SUPERFICIE = (20, 28, 40)   # COLOR.superficie #141C28
MARFIL = (243, 235, 226)    # COLOR.texto      #F3EBE2
CHAMPAGNE = (212, 180, 131) # COLOR.acento     #D4B483

# Tipografias del sistema (ver arriba). Didot y Bodoni 72 traen cursiva en el indice 1.
RUTA_RAW = ('/System/Library/Fonts/Supplemental/Didot.ttc', 0)
RUTA_STUDIO = ('/System/Library/Fonts/Supplemental/Bodoni 72.ttc', 1)


def fuente(ruta, px):
    return ImageFont.truetype(ruta[0], px, index=ruta[1])


def fondo_tarjeta(w, h):
    """Navy con un degradado vertical suave: del void arriba al navy abajo."""
    img = Image.new('RGB', (w, h), FONDO)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        c = tuple(round(FONDO[i] + (SUPERFICIE[i] - FONDO[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def wordmark(alto_raw, espaciado=0.22, fondo=None):
    """«RAW» espaciado en marfil + «studio» en cursiva champagne, en una linea.

    Devuelve una imagen RGBA con el wordmark recortado a su caja. `alto_raw` es
    el cuerpo de la RAW en px; «studio» va a 1.125x, como en el wordmark del
    sitio (`Wordmark.tsx`). Se dibuja a 4x y se reduce: PIL no antialiasea
    bien el trazo fino de una didona a tamaños chicos."""
    k = 4
    f_raw = fuente(RUTA_RAW, alto_raw * k)
    f_stu = fuente(RUTA_STUDIO, round(alto_raw * 1.125 * k))
    sp = round(alto_raw * k * espaciado)

    # medir
    d0 = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    anchos = [d0.textlength(c, font=f_raw) for c in 'RAW']
    w_raw = sum(anchos) + sp * 3          # espacio tambien tras la W (como letter-spacing)
    w_stu = d0.textlength('studio', font=f_stu)
    gap = round(alto_raw * k * 0.08)
    W = round(w_raw + gap + w_stu) + 8 * k
    H = round(alto_raw * k * 1.7)
    lienzo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lienzo)

    base = round(H * 0.72)   # linea de base comun
    x = 4 * k
    for c, a in zip('RAW', anchos):
        d.text((x, base), c, font=f_raw, fill=MARFIL + (255,), anchor='ls')
        x += a + sp
    d.text((x + gap - sp + sp * 0, base), 'studio', font=f_stu, fill=CHAMPAGNE + (255,), anchor='ls')

    caja = lienzo.getbbox()
    lienzo = lienzo.crop(caja)
    return lienzo.resize((max(1, lienzo.width // k), max(1, lienzo.height // k)), Image.LANCZOS)


def tarjeta():
    """1200x630, la medida que piden Open Graph y Twitter."""
    W, H = 1200, 630
    img = fondo_tarjeta(W, H).convert('RGBA')
    wm = wordmark(150)
    x = (W - wm.width) // 2
    y = (H - wm.height) // 2 - 18
    img.alpha_composite(wm, (x, y))

    # Un filete champagne debajo, corto y centrado: da escala a la tarjeta.
    d = ImageDraw.Draw(img)
    ancho_regla = 120
    yr = y + wm.height + 44
    d.rectangle([(W - ancho_regla) // 2, yr, (W + ancho_regla) // 2, yr + 2], fill=CHAMPAGNE + (255,))
    return img.convert('RGB')


def sello(lado):
    """El monograma «RS» de public/favicon.svg: champagne sobre navy.

    En el favicon es Georgia 700 sobre una caja de 32 con esquinas de 4. Aqui,
    a pantalla completa y cuadrado (iOS y Android aplican su propia mascara), con
    la didona de la marca en vez de Georgia."""
    s = lado * 4
    img = Image.new('RGBA', (s, s), SUPERFICIE + (255,))
    d = ImageDraw.Draw(img)
    f = fuente(RUTA_STUDIO, round(s * 0.40))
    # RS en la cursiva de la marca, con un poco de aire entre letras
    texto = 'RS'
    w = d.textlength(texto, font=f) + s * 0.02
    d.text(((s - w) / 2, s * 0.5), texto, font=f, fill=CHAMPAGNE + (255,), anchor='ls')
    # un filete fino abajo: la «linea de sello»
    d.rectangle([s * 0.36, s * 0.62, s * 0.64, s * 0.62 + max(2, s * 0.008)], fill=CHAMPAGNE + (200,))
    return img.resize((lado, lado), Image.LANCZOS)


def logo_correo():
    """El logo que pinta Gmail si el correo de recuperacion lo pide como imagen.

    La plantilla (`supabase/templates/recuperar.html`) ya NO lo usa: lleva el
    wordmark en texto, que no se bloquea como imagen ni depende de que cargue.
    Se sigue generando porque una plantilla pegada a mano en el panel de
    Supabase puede seguir llamando a `correo/logo.png`, y que salga la marca
    nueva (y no la de neon) es mejor que un enlace roto.

    PNG con el fondo del correo incrustado, no transparente: la ven clientes
    viejos, y un PNG con alfa sobre un fondo que algunos pintan blanco deja el
    logo ilegible. Se dibuja a 2x de como se muestra (188x66)."""
    W, H = 376, 132
    img = Image.new('RGBA', (W, H), FONDO + (255,))
    wm = wordmark(52)
    img.alpha_composite(wm, ((W - wm.width) // 2, (H - wm.height) // 2))
    return img.convert('RGB')


def main():
    SALIDA.mkdir(exist_ok=True)

    t = tarjeta()
    t.save(SALIDA / 'og.png', optimize=True)
    print(f"  og.png                 {t.width}x{t.height}  "
          f"{(SALIDA / 'og.png').stat().st_size // 1024} KB")

    # 180 es el que pide iOS; 192 y 512 los que pide el manifiesto.
    for lado, nombre in [(180, 'apple-touch-icon.png'),
                         (192, 'icon-192.png'),
                         (512, 'icon-512.png')]:
        sello(lado).save(SALIDA / nombre, optimize=True)
        print(f"  {nombre:<22} {lado}x{lado}  "
              f"{(SALIDA / nombre).stat().st_size // 1024} KB")

    (SALIDA / 'correo').mkdir(exist_ok=True)
    c = logo_correo()
    c.save(SALIDA / 'correo' / 'logo.png', optimize=True)
    print(f"  correo/logo.png        {c.width}x{c.height}  "
          f"{(SALIDA / 'correo' / 'logo.png').stat().st_size // 1024} KB")


if __name__ == '__main__':
    main()
