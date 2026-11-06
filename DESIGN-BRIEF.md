# RAWstudio — Brief de diseño visual (Miami Neon Night)

Dirección aprobada por el dueño. Implementar de forma incremental. Mobile-first.

## Paleta
- Fondo: #08080A / #111116
- Magenta neon: #FF2BD1
- Cian: #00E5FF
- Lima: #C8FF3D

## Wordmark
"RAW" en magenta neon + "studio" en lima neon, con glow suave. Estilo letrero de neón.

## Modos
- **Modo marca** (portada, cómo funciona, explorar, perfiles): fondos neon Miami (Art Deco + palmeras + piso mojado reflectante), más glow.
- **Modo consumo** (reproductor, wallet, configuración): más sobrio, acentos neon solo en botones y precios.

## Pantallas prioritarias (mobile-first)

### 1. Portada / Hero
- Wordmark neon
- Headline: GRABA. PONLE PRECIO. COBRA.
- Sub: El 80% de cada dólar es tuyo. Sin exclusividad.
- Botones: CREAR MI CUENTA (magenta sólido) + VER CÓMO FUNCIONA (cian outline)
- Fila visible de opciones: CÓMO FUNCIONA · PRECIOS · CREADORES · SOBRE NOSOTROS
- Badge 18+
- Fondo neon Miami

### 2. Cómo funciona
Tres cards con borde neon:
1. Crea tu cuenta
2. Sube tu video y ponle precio
3. Cobra el 80% por SPEI

### 3. Formas de ganar
Cards: Venta permanente, Renta 48/72h, Suscripción, Contenido a la medida, Propinas. Destacar 80%.

### 4. Explorar
Grid de clips con marcos neon, badges RENTA/SUSCRIPTORES, precio visible.

### 5. Vista de clip
Reproductor sobrio + botones de compra/renta magenta.

### 6. Perfil de creadora
Avatar, bio, stats, Seguir/Suscribirse, grid de clips.

### 7. Wallet
Balance grande, Retirar por SPEI, historial.

## Reglas
- Mobile-first. Opciones importantes visibles.
- No inventar features. Solo rediseñar presentación.
- Actualizar tokens en src/lib/diseño.ts de forma aditiva.
- Mantener funcionalidad existente (Supabase, rutas, etc.).
- Pedir confirmación antes de cambios grandes.

## Orden sugerido
1. Tokens de diseño + wordmark
2. Portada mobile + desktop
3. Cómo funciona + Formas de ganar
4. Resto de pantallas
