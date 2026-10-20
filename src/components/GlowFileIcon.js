import React from "react";
import emblem from "../assets/glow-emblem.png";

// Each kind of file gets its own Glow-branded tile: the emblem on a page, with a coloured band naming the type
const KINDS = [
  { test: /\.pdf$/i, label: "PDF", kind: "pdf" },
  { test: /\.docx?$/i, label: "DOC", kind: "word" },
  { test: /\.(xlsx?|csv)$/i, label: (n) => (/\.csv$/i.test(n) ? "CSV" : "XLS"), kind: "sheet" },
  { test: /\.pptx?$/i, label: "PPT", kind: "slides" },
  { test: /\.(png|jpe?g|gif|webp)$/i, label: "IMG", kind: "image" },
  { test: /\.txt$/i, label: "TXT", kind: "text" },
];

export const fileKind = (filename = "") => {
  const k = KINDS.find((x) => x.test.test(filename));
  if (!k) return { label: "FILE", kind: "other" };
  return { label: typeof k.label === "function" ? k.label(filename) : k.label, kind: k.kind };
};

export default function GlowFileIcon({ filename }) {
  const { label, kind } = fileKind(filename);
  return (
    <span className={`glow-file glow-file-${kind}`} aria-hidden="true">
      <img src={emblem} alt="" />
      <span className="glow-file-type">{label}</span>
    </span>
  );
}
