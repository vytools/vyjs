FROM node:20-alpine
RUN mkdir -p /app
WORKDIR /app
RUN npm install esbuild
COPY css /app/css
COPY js /app/js
COPY esbuild/bundle-html.mjs /app/esbuild/
COPY esbuild/bracket.js /app/esbuild/bracket.js
COPY esbuild/vydisp.js /app/esbuild/vydisp.js
