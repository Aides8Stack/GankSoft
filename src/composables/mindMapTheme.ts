import type { Theme } from "mind-elixir";
import { effectiveTheme } from "./preferences";
export function gankMapTheme(base: Theme): Theme {
  const dark = effectiveTheme.value === "dark";
  return {
    ...base,
    name: "GankSoft",
    type: dark ? "dark" : "light",
    // Public palette controls native branch strokes (the base Latte palette is pink).
    palette: dark ? ["#8fbaa0", "#9bc8ac", "#85b798"] : ["#b2d0b7", "#a9cdb6", "#bdd9c6"],
    cssVar: {
      ...base.cssVar,
      "--bgcolor": dark ? "#182720" : "#ffffff",
      "--root-bgcolor": dark ? "#314b40" : "#e8f3ee",
      "--root-color": dark ? "#e0ede3" : "#2c705e",
      "--root-border-color": dark ? "#6e9780" : "#b5d4c3",
      "--root-radius": "8px",
      "--main-radius": "8px",
      "--main-border": "1px solid #cfdfd3",
      "--topic-padding": "10px 12px",
      "--main-color": dark ? "#dbe8df" : "#34483c",
      "--main-bgcolor": dark ? "#263c30" : "#ffffff",
      "--main-bgcolor-transparent": dark ? "#263c30cc" : "#ffffffcc",
      "--color": dark ? "#b4cabd" : "#68766f",
      "--selected": dark ? "#8ecab4" : "#438d69",
      "--panel-bgcolor": dark ? "#22312d" : "#ffffff",
      "--panel-color": dark ? "#dbe8df" : "#34483c",
      "--panel-border-color": dark ? "#435c4c" : "#e1e5e1",
    },
  };
}
