import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — AH monogram in MTE red/black badge style. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "148px",
            height: "148px",
            borderRadius: "50%",
            border: "6px solid #E31C23",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "118px",
              height: "118px",
              borderRadius: "50%",
              border: "4px solid #E31C23",
              color: "#E31C23",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: "-0.06em",
              fontFamily: "Arial, Helvetica, sans-serif",
              lineHeight: 1,
            }}
          >
            AH
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
