# 📧 Clasificador de Emails en Raspberry Pi

Tu sistema para detectar **SPAM** automáticamente usando **Machine Learning**

## 📦 Archivos incluidos

```
email-classifier/
├── email_classifier_optimized.py    ⭐ Script principal (ejecutable)
├── email_classifier.py               📄 Versión simple (referencia)
├── requirements.txt                  📋 Dependencias Python
├── install_rpi.sh                    🚀 Script de instalación automática
├── SETUP_RASPBERRY_PI.md             📖 Guía paso a paso
├── COMANDOS_RAPIDOS.md               ⚡ Comandos útiles
├── credentials.json                  🔐 (Descargar desde Google Cloud)
├── token.pickle                      🎟️ (Se genera automáticamente)
├── email_classifier_model.pkl        🤖 (Se genera automáticamente)
├── classification_results.json       📊 (Resultados de clasificación)
└── classifier.log                    📝 (Registros de ejecución)
```

## ✅ CHECKLIST RÁPIDO

### 1️⃣ En tu computadora

- [ ] Descargar `credentials.json` desde [Google Cloud Console](https://console.cloud.google.com)
- [ ] Copiar los archivos a una carpeta

### 2️⃣ En tu Raspberry Pi

```bash
# Opción A: Instalación automática (RECOMENDADO)
bash install_rpi.sh

# Opción B: Instalación manual (ver SETUP_RASPBERRY_PI.md)
```

### 3️⃣ Transferir credenciales

```bash
# Desde tu computadora:
scp credentials.json pi@192.168.1.100:~/email-classifier/
```

### 4️⃣ Primera ejecución

```bash
cd ~/email-classifier
source venv/bin/activate
python3 email_classifier_optimized.py
```

### 5️⃣ (Opcional) Automatizar

```bash
crontab -e
# Añade: 0 * * * * cd ~/email-classifier && source venv/bin/activate && python3 email_classifier_optimized.py >> classifier.log 2>&1
```

## 🎯 ¿Cómo funciona?

```
1. Conecta a tu Gmail
    ↓
2. Descarga últimos 15 emails
    ↓
3. Analiza con Machine Learning
    ↓
4. Clasifica: SPAM vs LEGÍTIMO
    ↓
5. Guarda resultados en JSON
    ↓
6. Próxima ejecución: en 1 hora (si está automatizado)
```

## 🚀 Ejecución rápida

```bash
# 1. Entra a la carpeta
cd ~/email-classifier

# 2. Activa el entorno virtual
source venv/bin/activate

# 3. Ejecuta
python3 email_classifier_optimized.py

# 4. Ver resultados
cat classification_results.json
```

## 📊 Salida esperada

```
[2024-09-02 14:30:15] Iniciando clasificador...
[2024-09-02 14:30:20] ✓ Autenticación exitosa
[2024-09-02 14:30:21] 📧 Obtuvieron 15 emails
[2024-09-02 14:30:22] 🔄 Entrenando modelo con 10 ejemplos...
[2024-09-02 14:30:30] ✓ Modelo entrenado y guardado
[2024-09-02 14:30:31] 📬 Clasificando hasta 15 emails...
[2024-09-02 14:30:32] [1/15] ✓ HAM (5.2%) - Reunión de equipo esta semana
[2024-09-02 14:30:33] [2/15] 🚨 SPAM (92.3%) - ¡¡GANA $5000!! Haz clic aquí
...
[2024-09-02 14:30:45] 📊 Clasificación completada: 12 HAM, 3 SPAM
```

## 🔍 Ver resultados

Archivo: `classification_results.json`

```json
{
  "timestamp": "2024-09-02T14:30:45.123456",
  "stats": {
    "total": 15,
    "spam": 3,
    "ham": 12,
    "spam_percentage": 20.0
  },
  "emails": [
    {
      "subject": "Reunión de equipo",
      "sender": "jefe@empresa.com",
      "is_spam": false,
      "spam_probability": 0.05
    },
    ...
  ]
}
```

## ⚙️ Personalización

### Cambiar cantidad de emails

Edita `email_classifier_optimized.py`:

```python
# Cambia este número (línea al final)
classifier.classify_inbox(max_emails=15)  # Cambia 15 a otro número
```

### Entrenar con más ejemplos

```python
classifier.train_model(
    spam_emails=[
        "Tu ejemplo de spam 1",
        "Tu ejemplo de spam 2",
        ...
    ],
    ham_emails=[
        "Tu email legítimo 1",
        "Tu email legítimo 2",
        ...
    ]
)
```

## 🐛 Si algo falla

1. **Verifica los logs:**
   ```bash
   tail -20 classifier.log
   ```

2. **Soluciona según el error** (ver `COMANDOS_RAPIDOS.md`)

3. **Reinicia:**
   ```bash
   rm email_classifier_model.pkl token.pickle
   python3 email_classifier_optimized.py
   ```

## 📚 Documentación completa

- **Guía paso a paso:** `SETUP_RASPBERRY_PI.md`
- **Comandos útiles:** `COMANDOS_RAPIDOS.md`
- **Código comentado:** `email_classifier_optimized.py`

## 💾 Requisitos del sistema

- **Raspberry Pi:** 3B+ o superior
- **RAM:** 1GB+ (preferible 2GB)
- **Espacio:** 500MB
- **Internet:** Conexión estable
- **Python:** 3.7+

## 🎓 ¿Cómo aprende el modelo?

El sistema usa **Naive Bayes + TF-IDF**:

1. **TF-IDF:** Analiza palabras frecuentes en spam vs emails normales
2. **Naive Bayes:** Probabilidad de que un email sea spam

Ejemplos que detecta:
- ✅ Palabras de urgencia: "urgente", "actúa ya"
- ✅ Palabras de dinero: "ganar", "premio", "gratis"
- ✅ Múltiples enlaces sospechosos
- ✅ Patrones de mayúsculas excesivas

## 🤝 Soporte

Si necesitas ayuda:

1. Revisa `COMANDOS_RAPIDOS.md` → Sección "Solucionar problemas"
2. Revisa los logs: `tail -50 classifier.log`
3. Reinicia desde cero (borra `token.pickle` e `email_classifier_model.pkl`)

## 📝 Licencia

Código de ejemplo - Úsalo libremente en tu Raspberry Pi

---

**¿Listo para empezar?**

```bash
bash install_rpi.sh
```

🚀 ¡Que disfrutes clasificando emails!
