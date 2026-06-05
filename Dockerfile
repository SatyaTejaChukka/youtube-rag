# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for some Python packages (e.g. yt-dlp, chromadb)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install CPU-only torch
COPY backend/requirements.txt .
RUN pip install --no-cache-dir torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --default-timeout=1500 --no-cache-dir -r requirements.txt

# Copy backend application files
COPY backend/ .

# Expose port (Hugging Face routes to app_port in frontmatter, default is 7860)
ENV PORT=7860
EXPOSE 7860

# Run the application using our env port configuration
CMD ["python", "run.py"]
