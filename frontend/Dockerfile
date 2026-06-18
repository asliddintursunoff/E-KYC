FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BACKEND_ORIGIN=http://host.docker.internal:8000

COPY package.json ./
COPY server.mjs ./
COPY index.html ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]
