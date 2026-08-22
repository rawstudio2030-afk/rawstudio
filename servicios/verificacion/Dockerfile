FROM python:3.11-slim

# Dependencias de sistema que piden OpenCV y PaddleOCR.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Sin volumenes ni directorio de subidas: el servicio no escribe imagenes a
# disco por diseño.
# Hugging Face Spaces espera el 7860; en Railway o Render se sobreescribe
# con la variable PORT que ellos inyectan.
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
