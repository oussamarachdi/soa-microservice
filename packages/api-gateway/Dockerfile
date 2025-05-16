FROM node:18
WORKDIR /app
# Copy package.json file
COPY package.json ./
# Install dependencies
RUN npm install
# Copy source files
COPY src/ ./src/
# Create shared directory
RUN mkdir -p ./shared
# The shared directory will be mounted at runtime
EXPOSE 3000 50051
CMD ["npm", "start"]