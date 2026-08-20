# RAWstudio

Prototipo navegable de un marketplace de video de pago. Nueve pantallas, dos roles
(comprador y creador), sin backend: los datos son fijos.

**En vivo:** https://rawstudio2030-afk.github.io/rawstudio/
**Deck original:** https://rawstudio2030-afk.github.io/rawstudio/deck/

## De donde sale

Las pantallas se extrajeron del deck hecho en Claude Design y se convirtieron a
componentes React. El markup se conserva tal cual — estilos inline, medidas en px —
para que el resultado sea identico al diseno aprobado. Lo unico anadido es el
cableado de navegacion.

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura

    src/screens/     una pantalla por archivo, generada desde el deck
    src/App.tsx      rutas + indice de pantallas (andamio de prototipo)
    src/deck.css     keyframes de las animaciones, heredados del deck
    public/deck/     el deck original, como referencia

## Despliegue

Automatico: cada push a `main` dispara el workflow que compila y publica en Pages.

## Estado

Prototipo. No hay cuentas, ni pagos, ni base de datos. Antes de convertirlo en
producto real hay tres decisiones pendientes: procesador de pagos compatible con
contenido adulto (Stripe y PayPal no lo permiten), verificacion de edad, y como
proteger el video de descarga.
