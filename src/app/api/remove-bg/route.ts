import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Removes the background from an uploaded photo using the remove.bg API.
// Requires REMOVE_BG_API_KEY on the server. Returns a transparent PNG.
export async function POST(req: Request) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Background removal isn't configured. Set REMOVE_BG_API_KEY on the server." },
      { status: 503 },
    );
  }

  let body: { imageBase64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b64 = (body.imageBase64 || "").split(",").pop();
  if (!b64) return NextResponse.json({ error: "No image provided." }, { status: 400 });

  const form = new FormData();
  form.append("image_file_b64", b64);
  form.append("size", "auto");

  let res: Response;
  try {
    res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });
  } catch (e) {
    return NextResponse.json({ error: "Could not reach the background service.", detail: (e as Error)?.message }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json({ error: "Background removal failed.", detail }, { status: 502 });
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
