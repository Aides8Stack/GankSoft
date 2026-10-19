import ts from "typescript";
import { writeFileSync } from "node:fs";
const roots = [
  "shared/types.ts",
  "shared/review-contract.ts",
  "shared/review-analytics.ts",
  "shared/import-protocol.ts",
];
const program = ts.createProgram(roots, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowImportingTsExtensions: true,
  strict: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
function shape(t, depth = 0) {
  if (depth > 20) throw Error("recursive shape");
  if (t.flags & ts.TypeFlags.Undefined) return { type: "undefined" };
  if (t.flags & ts.TypeFlags.Null) return { type: "null" };
  if (t.isStringLiteral?.()) return { type: "literal", value: t.value };
  if (t.isNumberLiteral?.()) return { type: "literal", value: t.value };
  if (t.flags & ts.TypeFlags.BooleanLiteral)
    return { type: "literal", value: t.intrinsicName === "true" };
  if (t.flags & ts.TypeFlags.String) return { type: "string" };
  if (t.flags & ts.TypeFlags.Number) return { type: "number" };
  if (t.isUnion?.())
    return { type: "union", members: t.types.map((x) => shape(x, depth + 1)) };
  if (checker.isArrayType(t))
    return {
      type: "array",
      item: shape(checker.getTypeArguments(t)[0], depth + 1),
    };
  if (t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) {
    const idx = checker.getIndexTypeOfType(t, ts.IndexKind.String);
    if (idx) return { type: "record", item: shape(idx, depth + 1) };
    return {
      type: "object",
      properties: checker
        .getPropertiesOfType(t)
        .map((p) => ({
          name: p.name,
          optional: !!(p.flags & ts.SymbolFlags.Optional),
          shape: shape(
            checker.getTypeOfSymbolAtLocation(
              p,
              p.valueDeclaration ?? p.declarations[0],
            ),
            depth + 1,
          ),
        })),
    };
  }
  if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))
    return { type: "json" };
  throw Error("Unsupported " + checker.typeToString(t));
}
const names = {
  CollectionStatistics: "shared/review-analytics.ts",
  DeckInsights: "shared/review-analytics.ts",
  KnowledgeInsight: "shared/types.ts",
  Snapshot: "shared/types.ts",
  ReviewResult: "shared/review-contract.ts",
  CardReviewStats: "shared/review-analytics.ts",
  ExchangePackage: "shared/import-protocol.ts",
};
let output =
  '// Generated from retained domain/view types. Run node tools/build/generate-models.mjs.\nimport {createCodec} from "./model-codec.ts";\n';
for (const [name, file] of Object.entries(names)) {
  const source = program.getSourceFile(file);
  const declaration = source.statements.find((n) => n.name?.text === name);
  if (!declaration) throw Error(name);
  const descriptor = shape(checker.getTypeAtLocation(declaration));
  output += `import type {${name}} from '../${file.slice(7)}';\nexport const ${name}Codec=createCodec<${name}>(${JSON.stringify(descriptor)});\n`;
}
writeFileSync("shared/protocol/models.ts", output);
