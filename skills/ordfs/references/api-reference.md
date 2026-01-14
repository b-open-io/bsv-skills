# ORDFS API Reference

Complete API documentation for ORDFS (Ordinals File System).

**Base URL**: https://ordfs.network

## Content Endpoints

### GET /{pointer}

Direct content access by transaction outpoint.

**URL Format**:
```
/{txid}_{vout}
/{txid}.{vout}
/{txid}              # Defaults to vout 0
```

**Response**: Raw inscription content with headers.

**Headers**:
| Header | Description |
|--------|-------------|
| `Content-Type` | Inscription media type |
| `X-Outpoint` | Current outpoint (txid_vout) |
| `X-Origin` | Original inscription outpoint |
| `X-Ord-Seq` | Sequence number in chain |

**Example**:
```bash
curl https://ordfs.network/abc123...def_0
```

---

### GET /content/{pointer}[:{sequence}][/{filepath}]

Content endpoint with full options.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `pointer` | `txid_vout` or `txid` | Inscription outpoint |
| `sequence` | integer or `-1` | Version number (-1 = latest) |
| `filepath` | string | File path for directories |

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | boolean | true | Include content body |
| `map` | boolean | false | Include MAP metadata in header |
| `out` | boolean | false | Include raw output (base64) |
| `parent` | boolean | false | Include parent reference |
| `raw` | flag | - | Return directory JSON |

**Response Headers**:
| Header | Description |
|--------|-------------|
| `Content-Type` | Media type |
| `X-Outpoint` | Current outpoint |
| `X-Origin` | Original outpoint |
| `X-Ord-Seq` | Sequence number |
| `X-Map` | JSON MAP metadata (if requested) |
| `X-Parent` | Parent outpoint (if present) |
| `X-Output` | Base64 raw output (if requested) |
| `Cache-Control` | Caching directive |

**Examples**:
```bash
# Basic content
curl https://ordfs.network/content/abc123..._0

# With MAP metadata
curl https://ordfs.network/content/abc123..._0?map=true

# Specific sequence
curl https://ordfs.network/content/abc123..._0:5

# File from directory
curl https://ordfs.network/content/abc123..._0/style.css

# Directory listing
curl https://ordfs.network/content/abc123..._0?raw
```

---

### GET /preview/{b64HtmlData}

Preview base64-encoded HTML before inscribing.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `b64HtmlData` | base64 string | Base64-encoded HTML content |

**Response**: Rendered HTML page.

**Example**:
```javascript
const html = "<html><body><h1>Hello World</h1></body></html>";
const b64 = btoa(html);
const url = `https://ordfs.network/preview/${b64}`;
```

---

### POST /preview

Preview HTML via POST body.

**Content-Type**: `text/html`

**Body**: Raw HTML content.

**Response**: Rendered HTML page.

**Example**:
```bash
curl -X POST https://ordfs.network/preview \
  -H "Content-Type: text/html" \
  -d "<html><body><h1>Test</h1></body></html>"
```

---

## Metadata Endpoints

### GET /v2/metadata/{outpoint}

Retrieve inscription metadata without content.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `outpoint` | `txid_vout` | Inscription outpoint |

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `map` | boolean | false | Include MAP data |
| `parent` | boolean | false | Include parent |
| `out` | boolean | false | Include raw output |

**Response**:
```json
{
  "contentType": "text/html",
  "outpoint": "abc123..._0",
  "origin": "abc123..._0",
  "sequence": 5,
  "map": { "app": "myapp", "type": "ord" },
  "parent": "def456..._0",
  "output": "base64..."
}
```

---

## Block Endpoints

### GET /v1/bsv/block/latest

Get latest block information.

**Response**:
```json
{
  "hash": "000000...",
  "height": 850000,
  "time": 1704067200,
  "previousHash": "000000..."
}
```

---

### GET /v1/bsv/block/height/{height}

Get block by height.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `height` | integer | Block height |

---

### GET /v1/bsv/block/hash/{hash}

Get block by hash.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `hash` | hex string | Block hash (64 chars) |

---

### GET /v2/block/tip

Get latest block header.

**Response**: Block header data.

---

### GET /v2/chain/height

Get current blockchain height.

**Response**: Integer height value.

---

### GET /v2/block/{hashOrHeight}

Get block header by hash or height.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `hashOrHeight` | string/integer | Block hash or height |

---

## Transaction Endpoints

### GET /v1/bsv/tx/{txid}

Get raw transaction bytes.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `txid` | hex string | Transaction ID (64 chars) |

**Response**: Raw transaction bytes.

---

### GET /v2/tx/{txid}

Get raw transaction bytes (V2).

---

### GET /v2/tx/{txid}/proof

Get Merkle proof for transaction.

**Response**: Merkle proof data.

---

### GET /v2/tx/{txid}/beef

Get BEEF (Bitcoin Enhanced Easy Format) proof.

**Response**: BEEF format transaction with proof.

---

### GET /v2/tx/{txid}/{outputIndex}

Get specific transaction output.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `txid` | hex string | Transaction ID |
| `outputIndex` | integer | Output index (vout) |

---

## Streaming Endpoint

### GET /v2/stream/{outpoint}

Stream inscription content with HTTP Range support.

**Path Parameters**:
| Param | Format | Description |
|-------|--------|-------------|
| `outpoint` | `txid_vout` | Inscription outpoint |

**Request Headers**:
| Header | Format | Description |
|--------|--------|-------------|
| `Range` | `bytes=START-END` | Byte range request |

**Response Headers**:
| Header | Description |
|--------|-------------|
| `Accept-Ranges` | `bytes` |
| `Content-Range` | `bytes START-END/*` |
| `Content-Type` | Media type |
| `X-Origin` | Original outpoint |
| `X-Outpoint` | Requested outpoint |

**Response Status**: 206 Partial Content (for range requests)

**Example**:
```bash
curl https://ordfs.network/v2/stream/abc123..._0 \
  -H "Range: bytes=0-1023"
```

---

## Health Check

### GET /health

Check server health status.

**Response**:
```json
{
  "status": "ok"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "description of error"
}
```

**HTTP Status Codes**:
| Code | Description |
|------|-------------|
| 200 | Success |
| 206 | Partial Content (streaming) |
| 301 | Redirect (directory to index.html) |
| 400 | Bad Request (invalid parameters) |
| 404 | Not Found (inscription not found) |
| 500 | Internal Server Error |

---

## Caching

**Cache-Control Headers**:

| Scenario | TTL | Header |
|----------|-----|--------|
| Specific sequence | 30 days | `max-age=2592000, immutable` |
| Latest sequence | 60 seconds | `max-age=60` |
| No sequence | 0 | `no-cache, no-store, must-revalidate` |
| Block tip | 0 | `no-cache` |
| Deep blocks (100+) | 30 days | `max-age=2592000` |
| Recent blocks (4-99) | 1 hour | `max-age=3600` |
| Very recent (1-3) | 60 seconds | `max-age=60` |

---

## Rate Limiting

No explicit rate limiting documented. Use reasonable request patterns.

---

## CORS

CORS headers are included for browser access:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
