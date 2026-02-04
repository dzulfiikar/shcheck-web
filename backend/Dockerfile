FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install dependencies for Python execution (shcheck CLI) and curl
RUN apk add --no-cache python3 py3-pip curl

# Download latest shcheck from GitHub
RUN curl -L -o /tmp/shcheck.tar.gz https://github.com/santoru/shcheck/archive/refs/heads/master.tar.gz && \
    tar -xzf /tmp/shcheck.tar.gz -C /tmp && \
    mkdir -p /app/shcheck && \
    cp /tmp/shcheck-master/shcheck.py /app/shcheck/ && \
    chmod +x /app/shcheck/shcheck.py && \
    rm -rf /tmp/shcheck.tar.gz /tmp/shcheck-master

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Install Python for shcheck CLI execution and curl
RUN apk add --no-cache python3 py3-pip curl

# Download latest shcheck from GitHub
RUN curl -L -o /tmp/shcheck.tar.gz https://github.com/santoru/shcheck/archive/refs/heads/master.tar.gz && \
    tar -xzf /tmp/shcheck.tar.gz -C /tmp && \
    mkdir -p /app/shcheck && \
    cp /tmp/shcheck-master/shcheck.py /app/shcheck/ && \
    chmod +x /app/shcheck/shcheck.py && \
    rm -rf /tmp/shcheck.tar.gz /tmp/shcheck-master

# Copy package files
COPY package.json bun.lockb* ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["bun", "dist/index.js"]
