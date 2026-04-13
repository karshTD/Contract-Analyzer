FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --timeout=120 torch --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --timeout=120 -r requirements.txt

COPY . .

RUN mkdir -p /app/faiss_data /app/uploads


CMD ["celery", "-A", "tasks", "worker", "--loglevel=info"]