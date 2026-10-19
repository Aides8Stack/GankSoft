import type { Theme } from "mind-elixir";
import { effectiveTheme } from "./preferences";
export function gankMapTheme(base: Theme): Theme {
  const dark = effectiveTheme.value === "dark";
  return {
    ...base,
    name: "GankSoft",
    type: dark ? "dark" : "light",
    cssVar: {
      ...base.cssVar,
      "--bgcolor": dark ? "#182720" : "#f8faf7",
      "--root-bgcolor": "#386c65",
      "--root-color": "#ffffff",
      "--main-color": dark ? "#dbe8df" : "#34483c",
      "--main-bgcolor": dark ? "#263c30" : "#ffffff",
      "--main-bgcolor-transparent": dark ? "#263c30cc" : "#ffffffcc",
      "--color": dark ? "#b4cabd" : "#68766f",
      "--selected": "#63a589",
      "--panel-bgcolor": dark ? "#22312d" : "#ffffff",
      "--panel-color": dark ? "#dbe8df" : "#34483c",
      "--panel-border-color": dark ? "#435c4c" : "#e1e5e1",
    },
  };
}
