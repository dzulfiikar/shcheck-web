FROM oven/bun:1-alpine

WORKDIR /app

# Install Playwright dependencies and system packages
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    wget \
    nodejs \
    npm

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy test files
COPY . .

# Set environment variables for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create output directories
RUN mkdir -p playwright-report test-results

# Run tests
CMD ["bun", "test"]
