# Instalación del Clasificador de Emails en Raspberry Pi

## 📋 Requisitos previos

- Raspberry Pi con Raspbian/Raspberry Pi OS
- Conexión a internet
- Python 3.7+
- Acceso SSH o conexión directa

## 🚀 Paso 1: Actualizar el sistema

```bash
sudo apt update
sudo apt upgrade -y
```

## 🔧 Paso 2: Instalar dependencias del sistema

```bash
sudo apt install -y python3 python3-pip python3-venv git
```

Para Raspberry Pi con recursos limitados, también instala:

```bash
sudo apt install -y libatlas-base-dev libjasper-dev libtiff5 libjasper1 libharfbuzz0b libwebp6 libtiff5
```

## 📁 Paso 3: Crear carpeta del proyecto

```bash
mkdir ~/email-classifier
cd ~/email-classifier
```

## 🐍 Paso 4: Crear entorno virtual

```bash
python3 -m venv venv
```

Activar el entorno virtual:

```bash
source venv/bin/activate
```

**Importante:** Cuando veas `(venv)` al inicio de tu terminal, significa que está activado.

## 📦 Paso 5: Instalar paquetes Python

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Nota:** En Raspberry Pi esto puede tardar 10-20 minutos (especialmente scikit-learn). Paciencia.

## 🔐 Paso 6: Configurar Google Cloud API

### 6.1 Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto llamado "EmailClassifier"
3. Busca "Gmail API" y haz clic en "Habilitar"

### 6.2 Crear credenciales OAuth

1. Ve a "Credenciales" en el lado izquierdo
2. Haz clic en "Crear credenciales" → "ID de cliente OAuth"
3. Selecciona "Aplicación de escritorio"
4. Descarga el JSON (aparece un botón de descarga)
5. Rename como `credentials.json`

### 6.3 Transferir el archivo a Raspberry Pi

**Desde tu computadora:**

```bash
scp credentials.json pi@<IP_RASPBERRY>:~/email-classifier/
```

Reemplaza `<IP_RASPBERRY>` con la IP de tu Raspberry (ejemplo: `192.168.1.100`)

O copia el contenido manualmente en la Raspberry usando:

```bash
nano ~/email-classifier/credentials.json
```

Pega el contenido y guarda con `Ctrl+O` → `Enter` → `Ctrl+X`

## 📂 Paso 7: Copiar archivos del proyecto

Copia estos archivos a tu Raspberry en la carpeta `~/email-classifier`:

- `email_classifier.py` (el código principal)
- `email_classifier_optimized.py` (versión optimizada para Raspberry)

## ▶️ Paso 8: Ejecutar el clasificador

```bash
# Asegúrate que el venv esté activado
source venv/bin/activate

# Ejecuta el script
python3 email_classifier_optimized.py
```

**Primera ejecución:**
- Abrirá una ventana del navegador para autenticar con Google
- Aprueba el acceso
- Se guardará un token para futuras ejecuciones

## 🤖 Paso 9: Configurar ejecución automática (OPCIONAL)

Para que se ejecute automáticamente cada hora:

```bash
crontab -e
```

Añade esta línea al final:

```
0 * * * * cd ~/email-classifier && source venv/bin/activate && python3 email_classifier_optimized.py >> classifier.log 2>&1
```

Guarda con `Ctrl+O` → `Enter` → `Ctrl+X`

## 📊 Paso 10: Ver resultados

Los resultados se guardan en `classification_results.json`:

```bash
cat ~/email-classifier/classification_results.json
```

## 🐛 Solución de problemas

### Error: "No module named 'google'"
```bash
source venv/bin/activate
pip install google-auth-oauthlib google-api-python-client
```

### Error: "Permission denied" en credentials.json
```bash
chmod 600 ~/email-classifier/credentials.json
```

### Raspberry Pi se queda congelada
Reduce `max_emails` en el código a 10-20 en lugar de 50

### Error de memoria
```bash
# Aumentar memoria swap
sudo nano /etc/dphys-swapfile
# Cambia CONF_SWAPSIZE=100 a CONF_SWAPSIZE=2048
sudo systemctl restart dphys-swapfile
```

## 📝 Comandos útiles

Activar venv:
```bash
source ~/email-classifier/venv/bin/activate
```

Desactivar venv:
```bash
deactivate
```

Ver logs:
```bash
tail -f ~/email-classifier/classifier.log
```

Limpiar caché:
```bash
rm -rf ~/email-classifier/__pycache__
rm ~/email-classifier/*.pkl
```

## ✅ Verificar instalación

```bash
python3 -c "import sklearn, google.api_client; print('Todo OK')"
```

¡Listo! Tu clasificador está funcionando en Raspberry Pi 🎉
