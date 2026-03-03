FROM node:20-alpine
RUN mkdir -p /app
WORKDIR /app
RUN npm install esbuild
COPY css /app/css
COPY js /app/js
COPY esbuild/bundle-html.mjs /app/
COPY esbuild/vydisp.js /app/
COPY esbuild/vydisp.html /app/
