import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "MIDAS";
  const description =
    searchParams.get("description") ||
    "Trading IA — Signaux, analyses et strategies automatisees";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #06080F 0%, #0C0F1A 50%, #06080F 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold orb top-right */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Purple orb bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #FFD700, #B8860B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 900,
              color: "#06080F",
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: "#FFD700",
              letterSpacing: "4px",
            }}
          >
            MIDAS
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.3,
            marginBottom: "16px",
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            maxWidth: "600px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,215,0,0.4)",
            fontSize: "16px",
          }}
        >
          midas.purama.dev
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
