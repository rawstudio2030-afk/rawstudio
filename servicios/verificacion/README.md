---
title: RAWstudio Verificacion
emoji: 🔒
colorFrom: pink
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: Verificacion de edad e identidad. No persiste imagenes.
---

# Servicio de verificación · RAWstudio

Verifica edad e identidad combinando CURP, credencial del INE y selfie.

Vive aparte del sitio porque GitHub Pages sirve estáticos y esto necesita
Python con modelos de visión.

## El principio que ordena todo

**Las imágenes se procesan en memoria y nunca tocan disco.** Lo único que sale
del servicio es un booleano de mayoría de edad y la fecha.

No es una optimización: son datos biométricos, que la LFPDPPP clasifica como
sensibles. Lo que no se guarda no se puede filtrar, ni robar, ni entregar por
requerimiento. Es también lo que promete la página de creadoras — *«guardamos
un hash, no tu cara»*.

## Cómo verifica

1. **CURP** — se valida formato y dígito verificador, y de ahí sale la fecha de
   nacimiento. La CURP sola ya determina la edad; va primero porque es
   instantáneo y evita correr modelos de visión si el dato básico no cuadra.
2. **INE** — OCR para comprobar que la credencial contiene la CURP declarada.
   Sin este paso, alguien podría presentar la CURP de un adulto cualquiera junto
   con su propia selfie.
3. **Rostro** — cotejo entre la foto de la credencial y la selfie.
4. **Geobloqueo** — por IP.

## Desplegar

Con Docker, en Railway, Render o Hugging Face Spaces:

```
docker build -t rawstudio-verificacion .
docker run -p 8000:8000 rawstudio-verificacion
```

La primera petición descarga los modelos (~300 MB). Conviene precalentarlos en
el arranque si la plataforma cobra por tiempo de respuesta.

### Variables

| Variable | Para qué | Valor por omisión |
|---|---|---|
| `ORIGENES_PERMITIDOS` | CORS | `https://rawstudio.biz` |
| `PAISES_PERMITIDOS` | geobloqueo | `MX` |
| `GEO_ACTIVO` | apagarlo en desarrollo | `true` |
| `MAX_IMAGEN_MB` | tamaño máximo | `8` |

## Tres límites que hay que tener presentes

**Esto no es un proveedor certificado de KYC.** InsightFace y PaddleOCR son
excelentes para una maqueta, pero para verificación de edad con valor legal
—que es lo que exige la regulación de contenido adulto— se necesita un
proveedor con certificación. En México, Incode y Metamap hacen exactamente esto
y emiten constancia. Este servicio demuestra el flujo; no lo sustituye.

**No hay detección de vida.** Una selfie puede ser la foto de una foto, o una
pantalla frente a la cámara. La prueba de vida real necesita retos activos
—girar la cabeza, parpadear— o modelos especializados. Sin eso, el cotejo
facial comprueba parecido, no presencia.

**El geobloqueo no es un control.** Una VPN lo salta en un minuto. Sirve como
señal de cumplimiento y para reducir tráfico casual, no para impedir el acceso
de quien se lo propone.
