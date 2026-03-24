/**
 * Server-side proxy for ECCC Hydrometric real-time water temperature data.
 * Bypasses CORS restrictions that block direct browser requests to wateroffice.ec.gc.ca.
 *
 * Usage:
 *   GET /api/watertemp?stationId=02GA010
 *   Returns: { tempC: number, ageMs: number, stationId: string }
 */

const ECCC_BASE = "https://wateroffice.ec.gc.ca/services/real_time_service/csv";
// Water temperature = parameter 5 in ECCC's system
const PARAM_WATER_TEMP = "5";
// Timeout for upstream ECCC request
const FETCH_TIMEOUT_MS = 8_000;

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");

  if (!stationId || !/^[A-Z0-9]{7,10}$/.test(stationId)) {
    return Response.json(
      { error: "Invalid or missing stationId parameter" },
      { status: 400 }
    );
  }

  const ecccUrl = `${ECCC_BASE}?stations=${stationId}&parameters=${PARAM_WATER_TEMP}`;

  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    res = await fetch(ecccUrl, { signal: controller.signal });
    clearTimeout(timer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }

  if (!res.ok) {
    return Response.json(
      { error: `ECCC returned HTTP ${res.status}` },
      { status: 502 }
    );
  }

  const text = await res.text();

  // ECCC CSV format:
  //   # comment lines begin with #
  //   Date,Value,Grade,Symbol,Approval
  //   2025-06-15 14:00:00,18.4,...
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => !l.startsWith("#") && l.trim().length > 0);

  // First non-comment line is the header; skip it
  const dataLines = lines.slice(1);

  if (dataLines.length === 0) {
    return Response.json(
      { error: "No data rows in ECCC response" },
      { status: 502 }
    );
  }

  const lastLine = dataLines[dataLines.length - 1];
  const parts = lastLine.split(",");

  const dateStr = parts[0]?.trim();
  const valueStr = parts[1]?.trim();

  const tempC = parseFloat(valueStr ?? "");
  if (isNaN(tempC)) {
    return Response.json(
      { error: "Could not parse temperature value from ECCC response" },
      { status: 502 }
    );
  }

  const readingTime = dateStr ? new Date(dateStr).getTime() : NaN;
  const ageMs = isNaN(readingTime) ? 0 : Date.now() - readingTime;

  return Response.json(
    { tempC, ageMs, stationId },
    {
      headers: {
        // Allow the response to be cached by the service worker / CDN for up to 2 hours
        "Cache-Control": "public, max-age=7200, s-maxage=7200",
      },
    }
  );
}
