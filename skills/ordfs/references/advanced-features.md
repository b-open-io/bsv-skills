# ORDFS Advanced Features

Advanced functionality for ORDFS including DNS routing, streaming, and directories.

## DNS-Based Domain Routing

Map custom domains to on-chain content without running your own server.

### Setup

Create a DNS TXT record for your domain:

**Record Name**: `_ordfs.yourdomain.com`
**Record Type**: TXT
**Record Value**: `ordfs={pointer}[:{sequence}]`

**Examples**:
```
_ordfs.myapp.com    TXT "ordfs=abc123...def_0"
_ordfs.mysite.org   TXT "ordfs=abc123...def_0:5"
```

### How It Works

1. User visits `https://myapp.com/path/to/file`
2. ORDFS receives request, checks hostname
3. Performs DNS TXT lookup for `_ordfs.myapp.com`
4. Extracts pointer and optional sequence
5. Resolves inscription at pointer
6. Returns content from inscription directory at `/path/to/file`

### Requirements

- Domain must have valid TXT record
- Inscription should be a directory (`ord-fs/json`) for multi-file sites
- DNS propagation takes ~5 minutes (cached)

### DNS Cache

DNS results are cached for 5 minutes in Redis. Changes may take time to propagate.

---

## Directory Inscriptions (ord-fs/json)

Create multi-file applications as a single logical unit.

### Directory Format

Content type: `ord-fs/json`

```json
{
  "index.html": "ord://abc123..._0",
  "css/style.css": "def456..._0",
  "js/app.js": "ghi789..._0",
  "images/logo.png": "jkl012..._0"
}
```

### Reference Formats

Directory entries support multiple reference formats:

| Format | Example |
|--------|---------|
| Full ordinal URI | `ord://abc123..._0` |
| Outpoint | `abc123..._0` |
| Txid only | `abc123...` (vout 0) |

### Creating a Directory

1. Inscribe all individual files first
2. Create JSON mapping paths to outpoints
3. Inscribe the JSON with content type `ord-fs/json`
4. Use the directory outpoint as your entry point

**Example TypeScript**:
```typescript
const directory = {
  "index.html": `${htmlTxid}_0`,
  "style.css": `${cssTxid}_0`,
  "app.js": `${jsTxid}_0`
};

// Inscribe directory using @1sat/actions
import { inscribe, createContext } from '@1sat/actions'

const ctx = createContext(wallet)
const result = await inscribe.execute(ctx, {
  base64Content: btoa(JSON.stringify(directory)),
  contentType: 'ord-fs/json',
})
```

### Accessing Directory Files

```
/content/{directory_pointer}/index.html
/content/{directory_pointer}/css/style.css
/content/{directory_pointer}/js/app.js
```

### SPA Fallback

For single-page applications, unknown paths fall back to `index.html`:

```
/content/{pointer}/unknown/route → Returns index.html
```

This enables client-side routing in React, Vue, etc.

### Raw Directory Listing

To get the directory JSON instead of index.html:

```
/content/{pointer}?raw
```

---

## Sequence Versioning

Track and access different versions of an inscription.

### Origin vs Outpoint

- **Origin**: The first outpoint where the inscription was created
- **Outpoint**: Current location of the inscription after transfers

### Sequence Numbers

| Sequence | Meaning |
|----------|---------|
| 0 | Original inscription |
| 1, 2, 3... | Subsequent updates |
| -1 | Latest version |

### Accessing Versions

```
/{origin}          # Latest (implicit -1)
/{origin}:-1       # Latest (explicit)
/{origin}:0        # Original
/{origin}:5        # Version 5
```

### Version Chain

Each time an inscription output is spent, a new version can be created. The sequence tracks this chain.

**Chain Resolution**:
1. Backward crawl from requested outpoint to find origin
2. Forward crawl from origin to find requested sequence
3. Return content at target sequence

### Caching Strategy

| Access Pattern | Cache TTL |
|---------------|-----------|
| Specific sequence (`:N`) | 30 days (immutable) |
| Latest (`:-1` or none) | 60 seconds |

---

## Streaming Content

Stream large inscriptions with HTTP Range requests.

### Endpoint

```
GET /v2/stream/{outpoint}
```

### Range Requests

```bash
# First 1KB
curl https://ordfs.network/v2/stream/abc..._0 \
  -H "Range: bytes=0-1023"

# Bytes 1000-2000
curl https://ordfs.network/v2/stream/abc..._0 \
  -H "Range: bytes=1000-2000"
```

### Response

**Status**: 206 Partial Content

**Headers**:
```
Accept-Ranges: bytes
Content-Range: bytes 0-1023/*
Content-Type: application/octet-stream
```

### ORDFS Chain Streaming

For inscriptions that span multiple transactions (ORDFS protocol), streaming concatenates content across the chain.

---

## Recursive Inscriptions

Create dynamic content that references other inscriptions.

### HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/content/style_txid_0">
</head>
<body>
  <img src="/logo_txid_0" />
  <script src="/content/app_txid_0"></script>
</body>
</html>
```

### JavaScript Fetch

```javascript
// From within an inscription
const data = await fetch('/content/data_txid_0');
const json = await data.json();
```

### Base Path Handling

ORDFS automatically sets up base paths for recursive content resolution.

For inscription at `/content/abc123_0`:
- Relative `/other_txid_0` resolves to `https://ordfs.network/other_txid_0`
- Absolute paths work as expected

### Libraries/Frameworks

Common on-chain libraries can be referenced:

```html
<!-- On-chain React -->
<script src="/content/react_txid_0"></script>
<script src="/content/react-dom_txid_0"></script>

<!-- On-chain Tailwind -->
<link href="/content/tailwind_txid_0" rel="stylesheet">
```

---

## Preview Before Inscribe

Test HTML content before committing to blockchain.

### Base64 Preview

```javascript
const html = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Preview Test</h1></body>
</html>
`;

const previewUrl = `https://ordfs.network/preview/${btoa(html)}`;
window.open(previewUrl);
```

### POST Preview

For larger HTML or avoiding URL length limits:

```javascript
const response = await fetch('https://ordfs.network/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'text/html' },
  body: html
});

// Response is the rendered HTML
const rendered = await response.text();
```

### Testing Recursive Inscriptions

Preview won't resolve actual inscription references. Use placeholders or mock data for testing, then update references before final inscription.

---

## Server Setup (Self-Hosting)

Run your own ORDFS server.

### Prerequisites

- Go 1.25+
- Redis
- Environment configuration

### Environment Variables

```env
PORT=3000
REDIS_URL=redis://localhost:6379/0
JUNGLEBUS=https://junglebus.gorillapool.io
BLOCK_HEADERS_URL=https://block-headers.gorillapool.io
BLOCK_HEADERS_TOKEN=
ORDFS_HOST=your-ordfs-domain.com
LOG_LEVEL=info
ENV=production
ORDFS_NAME=My ORDFS
```

### Running

```bash
git clone https://github.com/b-open-io/go-ordfs-server
cd go-ordfs-server
go mod tidy
go run cmd/server/main.go
```

### Production Build

```bash
go build -o ordfs ./cmd/server
./ordfs
```

### Redis Requirements

Redis is used for:
- Caching parsed inscriptions
- DNS resolution cache
- Crawl coordination locks
- Sequence/origin mappings

---

## Performance Considerations

### Caching

- Immutable content (specific sequence) cached for 30 days
- Latest version cached for 60 seconds
- Use specific sequences when possible for better caching

### Parallel Requests

For multi-file applications, browsers can load files in parallel. ORDFS handles concurrent requests efficiently.

### CDN Integration

Place a CDN (Cloudflare, etc.) in front of ORDFS:
- Configure cache rules based on sequence parameter
- Longer cache for specific sequences
- Shorter/no cache for latest

### Preloading

For directories, preload critical resources:

```html
<link rel="preload" href="/content/{origin}/app.js" as="script">
<link rel="preload" href="/content/{origin}/style.css" as="style">
```
