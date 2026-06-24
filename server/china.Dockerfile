FROM python:3.12

# Configure Chinese PyPI mirror (USTC/中科大 — persists in image for runtime pip as well)
RUN mkdir -p /root/.pip && \
    printf '[global]\nindex-url = https://mirrors.ustc.edu.cn/pypi/web/simple\ntrusted-host = mirrors.ustc.edu.cn\n' > /root/.pip/pip.conf

WORKDIR /app

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Copy requirements first for better caching
COPY server/requirements.txt .
RUN pip install -r requirements.txt

# Copy server code and install mem0ai system-wide
COPY server .
RUN pip install mem0ai[graph] ollama

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
