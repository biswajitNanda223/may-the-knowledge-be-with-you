FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
COPY prisma prisma
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build -w @mtkbwy/api
FROM node:22-alpine
ARG NODE_ENV
ARG API_PORT
ENV NODE_ENV=${NODE_ENV}
ENV API_PORT=${API_PORT}
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data
USER node
EXPOSE ${API_PORT}
CMD ["node", "dist/server.js"]
