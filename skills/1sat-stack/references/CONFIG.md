# 1sat-stack Configuration Guide

Configuration for self-hosted 1sat-stack deployments using YAML files.

## Configuration Structure

1sat-stack uses a hierarchical configuration system where each service can be:
- `disabled` - Service not available
- `embedded` - Runs within the main process
- `remote` - Connects to external service via HTTP

## Full Configuration Example

```yaml
# Store configuration (required)
store:
  mode: embedded
  provider: badger  # badger, redis, or mongodb
  badger:
    path: "./data"
  redis:
    addr: "localhost:6379"
    password: ""
    db: 0

# BEEF storage service
beef:
  mode: embedded
  chain:
    - "lru://capacity=1000"
    - "redis://localhost:6379"
    - "junglebus://api.junglebus.io"

# Indexer service
indexer:
  mode: embedded
  tags:
    - p2pkh
    - lock
    - inscription
    - bsv21
    - ordlock
    - map
    - bap
  parsers:
    - name: p2pkh
      enabled: true
    - name: inscription
      enabled: true
      options:
        collections:
          - "collection1"
          - "collection2"

# BSV21 token service
bsv21:
  mode: embedded
  topics:
    - tm_bsv21
  lookup_services:
    - "https://lookup1.example.com"
    - "https://lookup2.example.com"

# Overlay network service
overlay:
  mode: embedded
  topics:
    - default
    - tm_bsv21
  submit_url: "https://overlay.example.com/submit"
  lookup_url: "https://overlay.example.com/lookup"

# ORDFS content service
ordfs:
  mode: embedded
  base_url: "https://ordfs.network"
  cache:
    enabled: true
    ttl: 3600
    max_size: "1GB"

# Event publishing
pubsub:
  mode: embedded
  provider: redis  # redis or channels
  redis:
    addr: "localhost:6379"

# HTTP server
http:
  addr: ":8080"
  cors:
    enabled: true
    origins:
      - "*"
  rate_limit:
    enabled: true
    authenticated: 100
    anonymous: 20

# Logging
logging:
  level: info  # debug, info, warn, error
  format: json  # json or text
  modules:
    indexer: debug
    beef: info
    bsv21: debug
```

## Service-Specific Configuration

### Store Configuration

The store is the backbone of 1sat-stack. Choose based on deployment needs:

**Badger (Embedded KV)**
```yaml
store:
  mode: embedded
  provider: badger
  badger:
    path: "./data"
    compression: true
    encryption: false
```

**Redis (Distributed)**
```yaml
store:
  mode: embedded
  provider: redis
  redis:
    addr: "localhost:6379"
    password: "your-password"
    db: 0
    pool_size: 10
```

**MongoDB (Document Store)**
```yaml
store:
  mode: embedded
  provider: mongodb
  mongodb:
    uri: "mongodb://localhost:27017"
    database: "1sat"
```

### Indexer Configuration

Configure which outputs to parse and index:

```yaml
indexer:
  mode: embedded
  # Tags determine which parsers run
  tags:
    - p2pkh        # Standard payments
    - inscription  # Ordinal inscriptions
    - bsv21       # BSV21 tokens
    - ordlock     # Ordinal locks
    - map         # MAP protocol
    - bap         # BAP protocol
    - sigma       # Sigma protocol

  # Parser-specific options
  parsers:
    - name: inscription
      enabled: true
      options:
        max_size: 10485760  # 10MB max inscription
        allowed_types:
          - "image/*"
          - "text/*"
          - "application/json"
```

### BSV21 Configuration

Token-specific settings:

```yaml
bsv21:
  mode: embedded
  # Topic managers to monitor
  topics:
    - tm_bsv21

  # Token validation
  validation:
    strict: true
    max_supply: "21000000000000000000"  # 21 million with 8 decimals

  # Lookup services for token discovery
  lookup_services:
    - url: "https://tokens.1sat.app"
      timeout: 30s
```

### Overlay Configuration

Network topology settings:

```yaml
overlay:
  mode: embedded

  # Topics this node manages
  topics:
    - default
    - tm_bsv21
    - tm_inscriptions

  # Peer services
  submit_url: "https://overlay.network/submit"
  lookup_url: "https://overlay.network/lookup"

  # Sync settings
  sync:
    interval: 5m
    batch_size: 100
    max_retries: 3
```

## Deployment Modes

### Development Mode

Minimal configuration for local development:

```yaml
store:
  mode: embedded
  provider: badger
  badger:
    path: "./dev-data"

beef:
  mode: embedded

indexer:
  mode: embedded
  tags: [p2pkh, inscription, bsv21]

bsv21:
  mode: embedded

overlay:
  mode: embedded

ordfs:
  mode: embedded

http:
  addr: ":8080"
  cors:
    enabled: true
    origins: ["*"]

logging:
  level: debug
  format: text
```

### Production Mode

Scalable configuration with external services:

```yaml
store:
  mode: embedded
  provider: redis
  redis:
    addr: "redis-cluster:6379"
    password: "${REDIS_PASSWORD}"

beef:
  mode: remote
  url: "http://beef-service:8080"

indexer:
  mode: remote
  url: "http://indexer-service:8081"

bsv21:
  mode: remote
  url: "http://bsv21-service:8082"

overlay:
  mode: remote
  url: "http://overlay-service:8083"

ordfs:
  mode: remote
  url: "http://ordfs-service:8084"

http:
  addr: ":8080"
  tls:
    enabled: true
    cert: "/certs/cert.pem"
    key: "/certs/key.pem"

logging:
  level: info
  format: json
```

## Environment Variables

Override configuration with environment variables:

```bash
# Store
export STORE_PROVIDER=redis
export STORE_REDIS_ADDR=localhost:6379

# HTTP
export HTTP_ADDR=:8080
export HTTP_CORS_ENABLED=true

# Logging
export LOG_LEVEL=debug
export LOG_FORMAT=json

# Service URLs (for remote mode)
export BEEF_URL=http://beef:8080
export INDEXER_URL=http://indexer:8081
export BSV21_URL=http://bsv21:8082
```

## Docker Deployment

Example `docker-compose.yml`:

```yaml
version: '3.8'

services:
  1sat-stack:
    image: bopen/1sat-stack:latest
    ports:
      - "8080:8080"
    environment:
      - STORE_PROVIDER=redis
      - STORE_REDIS_ADDR=redis:6379
      - LOG_LEVEL=info
    volumes:
      - ./config.yaml:/config.yaml
    command: ["--config", "/config.yaml"]
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

## Performance Tuning

### Store Performance

**Badger Tuning**
```yaml
store:
  badger:
    num_goroutines: 8
    mem_table_size: 67108864  # 64MB
    value_log_file_size: 1073741824  # 1GB
```

**Redis Tuning**
```yaml
store:
  redis:
    pool_size: 50
    min_idle_conns: 10
    max_retries: 3
```

### HTTP Performance

```yaml
http:
  read_timeout: 30s
  write_timeout: 30s
  max_header_bytes: 1048576  # 1MB
  rate_limit:
    burst: 200
    requests_per_minute: 100
```

## Monitoring

Enable metrics and health checks:

```yaml
metrics:
  enabled: true
  addr: ":9090"
  path: "/metrics"

health:
  enabled: true
  path: "/health"
  checks:
    - store
    - indexer
    - pubsub
```