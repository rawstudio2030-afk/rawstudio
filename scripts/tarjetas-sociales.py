#!/usr/bin/env python3
"""Las imagenes de marca que se pintan FUERA de la aplicacion.

La vista previa de un enlace, los iconos del telefono, y el logo que mete
Gmail en el correo de recuperacion. Tres sitios donde la marca la dibuja un
programa ajeno a partir de un archivo, no el CSS del sitio.

---------- Por que existia el hueco ----------

El sitio no tenia NI UNA etiqueta social: ni og:image, ni twitter:card, ni
apple-touch-icon, ni manifiesto. Cada enlace compartido a WhatsApp, a X o a
una biografia de TikTok salia en blanco. Para un sitio que crece por enlaces
eso es lo mas barato con mas retorno.

Y habia algo peor y mas tonto: el favicon apuntaba a /rawstudio/favicon.svg,
que da 404 en el dominio propio. El sitio llevaba sin icono desde que se
movio a rawstudio.biz.

---------- Por que Python y no un .mjs como los demas scripts ----------

Porque Pillow es el unico rasterizador que hay en esta maquina: no estan
rsvg-convert, ni inkscape, ni ImageMagick. ffmpeg si esta, pero no dibuja
circulos ni rasteriza SVG, y la alternativa era añadir una dependencia de npm
para generar cuatro imagenes que cambian una vez al año.

---------- Por que un script y no las imagenes a mano ----------

Porque el dia que cambie el logo hay que rehacer las cuatro, y «rehazlas como
estaban» sin receta acaba en cuatro imagenes que ya no combinan. Aqui la
receta son los mismos tokens de src/lib/diseño.ts, escritos una vez.

---------- Lo que la tarjeta NO lleva ----------

Contenido. Ni una portada, ni una miniatura, ni una silueta. Es la marca
sobre su fondo y nada mas, y es deliberado: esa imagen la va a pintar WhatsApp
en una conversacion y X en una linea de tiempo, sin que nadie la haya pedido
y delante de quien pase por ahi. Una plataforma de contenido adulto que mete
su contenido en la vista previa se gana que el enlace se marque, y de paso
expone a quien lo comparte.

    python3 scripts/tarjetas-sociales.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'src' / 'assets' / 'wordmark.png'
SALIDA = RAIZ / 'public'

# Los mismos de src/lib/diseño.ts. Si cambian alli, cambian aqui.
FONDO = (8, 8, 10)
SUPERFICIE = (17, 17, 22)
ACENTO = (255, 43, 209)
DINERO = (200, 255, 61)

# El correo no usa COLOR.fondo sino el suyo, un punto mas claro. Se copia de
# supabase/templates/recuperar.html y no se unifica: cambiar el fondo de un
# correo ya enviado es imposible, asi que esa plantilla congela sus colores.
FONDO_CORREO = (11, 11, 14)


def rayado(tam, color_a, color_b, paso=20, grosor=10):
    """La trama diagonal que ya usa el producto: el fondo de una portada sin
    foto y el de un avatar vacio son `repeating-linear-gradient(130deg, …)`.
    Se repite aqui para que la tarjeta se reconozca como del mismo sitio."""
    w, h = tam
    lienzo = Image.new('RGB', tam, color_a)
    d = ImageDraw.Draw(lienzo)
    # 130 grados: se dibuja como lineas de pendiente fija recorriendo el ancho
    # mas el alto, para que crucen el lienzo entero.
    for x in range(-h, w + h, paso):
        d.line([(x, 0), (x + h, h)], fill=color_b, width=grosor)
    return lienzo


def con_resplandor(logo, color, radio, opacidad):
    """El resplandor del wordmark: una copia teñida y desenfocada DEBAJO del
    original, no un filtro encima. Devuelve (halo, margen) — hay que pegarlo
    desplazado -margen en las dos direcciones.

    DOS COSAS QUE SALIERON MAL AL PRIMER INTENTO, y por las que esto tiene
    margen y una sola pasada:

    1. Desenfocar dentro del lienzo del propio logo RECORTA el halo en los
       cuatro bordes, y el recorte de un degradado es una linea recta. Salia
       una caja magenta con esquinas. El margen es 3 veces el radio porque un
       desenfoque gaussiano es despreciable mas alla de eso.

    2. Apilar la misma capa tres veces para que se note no la intensifica: la
       satura hasta volverla opaca, y entonces no es un resplandor sino un
       rectangulo. La intensidad se sube en el canal alfa, con tope."""
    m = radio * 3
    lienzo = (logo.width + m * 2, logo.height + m * 2)

    halo = Image.new('RGBA', lienzo, color + (0,))
    mascara = Image.new('L', lienzo, 0)
    mascara.paste(logo.getchannel('A'), (m, m))
    halo.putalpha(mascara.filter(ImageFilter.GaussianBlur(radio)))

    # Subir el alfa con tope en 255, en vez de componer varias veces.
    a = halo.getchannel('A').point(lambda v: min(255, int(v * opacidad)))
    halo.putalpha(a)
    return halo, m


def tarjeta():
    """1200x630, la medida que piden Open Graph y Twitter."""
    W, H = 1200, 630
    fondo = rayado((W, H), FONDO, SUPERFICIE, paso=26, grosor=13)

    logo = Image.open(ORIGEN).convert('RGBA')
    ancho = 560
    logo = logo.resize((ancho, round(ancho * logo.height / logo.width)), Image.LANCZOS)
    # Los mismos -2 grados que lleva en la pantalla.
    logo = logo.rotate(2, resample=Image.BICUBIC, expand=True)

    capa = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x = (W - logo.width) // 2
    y = (H - logo.height) // 2 - 26
    halo, m = con_resplandor(logo, ACENTO, 22, 2.1)
    capa.alpha_composite(halo, (x - m, y - m))
    capa.alpha_composite(logo, (x, y))

    d = ImageDraw.Draw(capa)
    # Una regla de dinero debajo. Corta, centrada: es el unico elemento que no
    # es el logo, y su trabajo es dar escala a la tarjeta.
    ancho_regla = 150
    yr = y + logo.height + 42
    d.rectangle([(W - ancho_regla) // 2, yr, (W + ancho_regla) // 2, yr + 5], fill=DINERO)

    fondo = fondo.convert('RGBA')
    fondo.alpha_composite(capa)
    return fondo.convert('RGB')


def simbolo(lado):
    """El circulo con el triangulo de play de public/favicon.svg, al pixel.

    El SVG usa un lienzo de 100: circulo en (50,50) r=26 con trazo 6, y el
    triangulo 41,39 -> 60,50 -> 41,61. Se escala desde ahi para que el icono
    de la app y la pestaña sean el MISMO dibujo y no dos parecidos."""
    # 4x y luego se reduce: PIL no antialiasea el trazo de un arco.
    s = lado * 4
    k = s / 100
    img = Image.new('RGBA', (s, s), FONDO + (255,))
    d = ImageDraw.Draw(img)
    r, t = 26 * k, 6 * k
    c = 50 * k
    d.ellipse([c - r, c - r, c + r, c + r], outline=ACENTO, width=round(t))
    d.polygon([(41 * k, 39 * k), (60 * k, 50 * k), (41 * k, 61 * k)], fill=DINERO)
    return img.resize((lado, lado), Image.LANCZOS)


def logo_correo():
    """El logo que pinta Gmail en el correo de recuperacion.

    Era un JPEG de 376x133 con el fondo incrustado, y un JPEG de un
    resplandor sobre negro es el peor caso posible para ese formato: el
    degradado se parte en bloques y quedan manchas cuadradas alrededor de las
    letras. Se veia a simple vista.

    Va en PNG y con el fondo del correo incrustado igual que antes. No
    transparente: la plantilla la ven clientes viejos, y un PNG con alfa
    sobre un fondo que algunos pintan blanco deja el logo ilegible. Mejor
    incrustar el fondo exacto de la plantilla.

    Se dibuja a 2x de como se muestra (188x66), que es lo que piden las
    pantallas densas."""
    logo = Image.open(ORIGEN).convert('RGBA')
    ancho = 330
    logo = logo.resize((ancho, round(ancho * logo.height / logo.width)), Image.LANCZOS)

    W, H = 376, 132
    fondo = Image.new('RGBA', (W, H), FONDO_CORREO + (255,))
    x, y = (W - logo.width) // 2, (H - logo.height) // 2
    halo, m = con_resplandor(logo, ACENTO, 14, 1.8)
    fondo.alpha_composite(halo, (x - m, y - m))
    fondo.alpha_composite(logo, (x, y))
    return fondo.convert('RGB')


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
        simbolo(lado).save(SALIDA / nombre, optimize=True)
        print(f"  {nombre:<22} {lado}x{lado}  "
              f"{(SALIDA / nombre).stat().st_size // 1024} KB")

    (SALIDA / 'correo').mkdir(exist_ok=True)
    # Paleta de 128 colores con difuminado: un PNG de 24 bits de un degradado
    # pesa 50 KB y con paleta pesa 20, y a este tamaño no se distingue uno de
    # otro —comprobado comparando las dos imagenes, no suponiendolo—.
    c = logo_correo().quantize(colors=128, method=Image.MEDIANCUT,
                               dither=Image.FLOYDSTEINBERG)
    c.save(SALIDA / 'correo' / 'logo.png', optimize=True)
    print(f"  correo/logo.png        {c.width}x{c.height}  "
          f"{(SALIDA / 'correo' / 'logo.png').stat().st_size // 1024} KB"
          f"   (antes: logo.jpg, 376x133, con artefactos)")


if __name__ == '__main__':
    main()
