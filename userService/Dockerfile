FROM python:3.11-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 3005

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3005"]
