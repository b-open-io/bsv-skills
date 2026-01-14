/**
 * ORDFS Content Fetching Patterns
 *
 * Examples of how to fetch and work with on-chain content via ORDFS.
 */

// Basic content fetch
async function fetchContent(origin: string): Promise<string> {
  const response = await fetch(`https://ordfs.network/${origin}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.text();
}

// Fetch with metadata
interface OrdfsMetadata {
  contentType: string;
  outpoint: string;
  origin: string;
  sequence: number;
  map?: Record<string, string>;
  parent?: string;
}

async function fetchWithMetadata(origin: string): Promise<{
  content: string;
  metadata: OrdfsMetadata;
}> {
  const response = await fetch(
    `https://ordfs.network/content/${origin}?map=true&parent=true`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const content = await response.text();

  const metadata: OrdfsMetadata = {
    contentType: response.headers.get("Content-Type") || "application/octet-stream",
    outpoint: response.headers.get("X-Outpoint") || origin,
    origin: response.headers.get("X-Origin") || origin,
    sequence: parseInt(response.headers.get("X-Ord-Seq") || "0", 10),
  };

  const mapHeader = response.headers.get("X-Map");
  if (mapHeader) {
    metadata.map = JSON.parse(mapHeader);
  }

  const parentHeader = response.headers.get("X-Parent");
  if (parentHeader) {
    metadata.parent = parentHeader;
  }

  return { content, metadata };
}

// Fetch specific version
async function fetchVersion(origin: string, sequence: number): Promise<string> {
  const response = await fetch(
    `https://ordfs.network/content/${origin}:${sequence}`
  );
  return response.text();
}

// Fetch latest version and get sequence number
async function fetchLatest(origin: string): Promise<{
  content: string;
  sequence: number;
  currentOutpoint: string;
}> {
  const response = await fetch(`https://ordfs.network/content/${origin}:-1`);

  return {
    content: await response.text(),
    sequence: parseInt(response.headers.get("X-Ord-Seq") || "0", 10),
    currentOutpoint: response.headers.get("X-Outpoint") || origin,
  };
}

// Fetch JSON content
async function fetchJson<T>(origin: string): Promise<T> {
  const response = await fetch(`https://ordfs.network/${origin}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.json();
}

// Fetch image as blob URL (for display)
async function fetchImageBlobUrl(origin: string): Promise<string> {
  const response = await fetch(`https://ordfs.network/${origin}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// Fetch directory listing
interface DirectoryListing {
  [path: string]: string;
}

async function fetchDirectory(origin: string): Promise<DirectoryListing> {
  const response = await fetch(
    `https://ordfs.network/content/${origin}?raw`
  );
  return response.json();
}

// Fetch file from directory
async function fetchDirectoryFile(
  directoryOrigin: string,
  filepath: string
): Promise<string> {
  const response = await fetch(
    `https://ordfs.network/content/${directoryOrigin}/${filepath}`
  );
  return response.text();
}

// Check if inscription exists
async function inscriptionExists(origin: string): Promise<boolean> {
  try {
    const response = await fetch(`https://ordfs.network/${origin}`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Build ORDFS URL
function buildOrdfsUrl(
  origin: string,
  options?: {
    sequence?: number;
    filepath?: string;
    map?: boolean;
    parent?: boolean;
    raw?: boolean;
  }
): string {
  let url = `https://ordfs.network/content/${origin}`;

  if (options?.sequence !== undefined) {
    url += `:${options.sequence}`;
  }

  if (options?.filepath) {
    url += `/${options.filepath}`;
  }

  const params = new URLSearchParams();
  if (options?.map) params.set("map", "true");
  if (options?.parent) params.set("parent", "true");
  if (options?.raw) params.set("raw", "true");

  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}

// Example usage
async function main() {
  const origin = "abc123...def_0";

  // Basic fetch
  const content = await fetchContent(origin);
  console.log("Content:", content);

  // With metadata
  const { content: c, metadata } = await fetchWithMetadata(origin);
  console.log("Metadata:", metadata);

  // Specific version
  const v5 = await fetchVersion(origin, 5);
  console.log("Version 5:", v5);

  // Latest version info
  const latest = await fetchLatest(origin);
  console.log("Latest sequence:", latest.sequence);

  // Directory operations
  const dirOrigin = "dir123...def_0";
  const listing = await fetchDirectory(dirOrigin);
  console.log("Directory:", listing);

  const cssFile = await fetchDirectoryFile(dirOrigin, "style.css");
  console.log("CSS:", cssFile);

  // Build URL with options
  const url = buildOrdfsUrl(origin, {
    sequence: 3,
    map: true,
    parent: true,
  });
  console.log("URL:", url);
}

export {
  fetchContent,
  fetchWithMetadata,
  fetchVersion,
  fetchLatest,
  fetchJson,
  fetchImageBlobUrl,
  fetchDirectory,
  fetchDirectoryFile,
  inscriptionExists,
  buildOrdfsUrl,
};
