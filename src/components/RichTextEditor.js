import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

const TOOLS = [
  { cmd: "bold", label: "Bold", Icon: Bold, key: "b" },
  { cmd: "italic", label: "Italic", Icon: Italic, key: "i" },
  { cmd: "underline", label: "Underline", Icon: Underline, key: "u" },
  { cmd: "insertUnorderedList", label: "Bulleted list", Icon: List },
  { cmd: "insertOrderedList", label: "Numbered list", Icon: ListOrdered },
];

// A small formatted-text box: bold, italic, underline and lists (Ctrl/Cmd+B, I, U work too).
// The server keeps only those tags, so whatever is pasted in comes back clean.
export default function RichTextEditor({ id, label, value, onChange, placeholder, minHeight = 120 }) {
  const box = useRef(null);
  const [active, setActive] = useState({});

  // Only push the value into the box when it changed from outside (typing must not move the cursor)
  useEffect(() => {
    const el = box.current;
    if (el && el.innerHTML !== (value || "")) el.innerHTML = value || "";
  }, [value]);

  const refresh = useCallback(() => {
    const el = box.current;
    const sel = document.getSelection();
    if (!el || !sel || !el.contains(sel.anchorNode)) return;
    const state = {};
    TOOLS.forEach((t) => {
      try {
        state[t.cmd] = document.queryCommandState(t.cmd);
      } catch (e) {
        state[t.cmd] = false;
      }
    });
    setActive(state);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  }, [refresh]);

  const run = (cmd) => {
    box.current?.focus();
    document.execCommand(cmd, false);
    onChange(box.current?.innerHTML || "");
    refresh();
  };

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label={`Formatting for ${label}`}>
        {TOOLS.map(({ cmd, label: name, Icon, key }) => (
          <button key={cmd} type="button" className={active[cmd] ? "on" : ""} aria-pressed={!!active[cmd]}
            title={key ? `${name} (Ctrl+${key.toUpperCase()})` : name} aria-label={name}
            onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd)}>
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={box}
        className="rte-box rich-text"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder={placeholder}
        style={{ minHeight }}
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyUp={refresh}
        onMouseUp={refresh}
      />
    </div>
  );
}

// Formatted text from the server (already cleaned there: only b/i/u/lists/paragraphs survive)
export function RichText({ html, empty = "—" }) {
  if (!html) return <span className="tt-muted">{empty}</span>;
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
