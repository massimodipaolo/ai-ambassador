FROM python:3.12-slim AS base
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update; \
  apt-get full-upgrade -y; \
  apt-get install -y --no-install-recommends \
  curl \
  libmagic1 libmagic-dev \
  tesseract-ocr \
  poppler-utils libpoppler-cpp-dev \
  libreoffice \
  libgl1-mesa-glx libglib2.0-0 python3-opencv \
  ; \
  apt-get clean; \
  rm -rf /var/lib/apt/lists/*

FROM base AS installer
RUN --mount=type=cache,target=/root/.cache/pip pip install ws-bom-robot-app==0.0.2
COPY src/robot/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

FROM installer AS runtime
WORKDIR /app
COPY src/robot .
RUN apt-get update && apt-get install -y openssh-server
RUN mkdir /var/run/sshd
RUN useradd -m 'ws.admin' && echo 'ws.admin:secret' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
EXPOSE 22 80
CMD ["fastapi", "run", "./main.py","--host","0.0.0.0","--port", "80","--workers","4"]
