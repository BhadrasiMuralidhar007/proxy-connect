# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# VITE_API_BASE is baked in at build time - point it at your deployed backend URL
ARG VITE_API_BASE=http://localhost:8080/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# React Router needs unknown paths to fall back to index.html
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; try_files $uri /index.html; } }' \
    > /etc/nginx/conf.d/default.conf
EXPOSE 80
