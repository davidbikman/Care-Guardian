FROM node:20-alpine
WORKDIR /app
COPY sync-server.js .
RUN mkdir -p /app/data
EXPOSE 3000
ENV PORT=3000
ENV DATA_DIR=/app/data
VOLUME ["/app/data"]
CMD ["node", "sync-server.js"]
