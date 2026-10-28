import type { Theme, MainLineParams, SubLineParams } from "mind-elixir";
import { effectiveTheme } from "./preferences";
// Public branch-generation extension; connect node edges at their vertical
// centres instead of underlining topics. The engine still owns all positions.
export function knowledgeBranch(p:MainLineParams|SubLineParams):string {
  if(p.direction==='down'){
    const x1=p.pL+p.pW/2,y1=p.pT+p.pH,x2=p.cL+p.cW/2,y2=p.cT,m=(y1+y2)/2;
    return `M ${x1} ${y1} C ${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
  }
  const left=p.direction==='lhs',x1=p.pL+(left?0:p.pW),y1=p.pT+p.pH/2,x2=p.cL+(left?p.cW:0),y2=p.cT+p.cH/2,m=(x1+x2)/2;
  return `M ${x1} ${y1} C ${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
}
export function gankMapTheme(base: Theme): Theme {
  const dark = effectiveTheme.value === "dark";
  return {
    ...base,
    name: "GankSoft",
    generateMainBranch:knowledgeBranch,
    generateSubBranch:knowledgeBranch,
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
