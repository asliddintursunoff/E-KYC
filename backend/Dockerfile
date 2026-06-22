
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip wheel --use-deprecated=legacy-resolver --wheel-dir /app/wheels -r requirements.txt


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /app/wheels /app/wheels
COPY requirements.txt .

RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt \
    && pip uninstall -y opencv-python \
    && rm -rf /app/wheels


COPY . .

EXPOSE 8000

CMD ["python3", "manage.py", "runserver", "0.0.0.0:8000"]