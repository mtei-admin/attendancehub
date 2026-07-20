import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** AttendanceHub favicon — AH monogram in MTE red/black badge style. */
export default function Icon() {
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
          borderRadius: "50%",
          border: "2px solid #E31C23",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1.5px solid #E31C23",
            color: "#E31C23",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            fontFamily: "Arial, Helvetica, sans-serif",
            lineHeight: 1,
          }}
        >
          AH
        </div>
      </div>
    ),
    { ...size },
  );
}
