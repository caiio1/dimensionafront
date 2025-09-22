# syntax=docker/dockerfile:1

# Stage 1 — Build do frontend
ARG NODE_VERSION=22.2.0
FROM node:${NODE_VERSION}-alpine AS build

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

WORKDIR /usr/src/app

# Copiar arquivos de dependências e instalar
COPY package*.json ./
RUN npm install

# Copiar todo o código fonte
COPY . .

# Build da aplicação (gera arquivos estáticos)
RUN npm run build

# Stage 2 — Servir com Nginx
FROM nginx:alpine AS production

# Copiar arquivos buildados do stage anterior
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Expor porta padrão do Nginx
EXPOSE 80

# Rodar o Nginx em primeiro plano
CMD ["nginx", "-g", "daemon off;"]
