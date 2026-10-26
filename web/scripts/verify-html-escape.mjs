// Verifies platform/Html.ts: text escaping and asset-name allow-listing.
// Run by scripts/test-all.mjs (npm test) alongside the other verify-*.mjs.
import { escapeHtml, safeAssetName, safeAssetPath } from "../src/platform/Html.ts";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

assert(escapeHtml('<img src="x" onerror="alert(1)">') === '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;', "escapeHtml must neutralise tags and quotes");
assert(escapeHtml("a & b < c > d 'e'") === "a &amp; b &lt; c &gt; d &#39;e&#39;", "escapeHtml must escape & < > '");
assert(escapeHtml(42) === "42", "escapeHtml coerces numbers to text");
assert(safeAssetName("pt-chief") === "pt-chief", "safeAssetName keeps internal names");
assert(safeAssetName("digit-5") === "digit-5", "safeAssetName keeps digit names");
assert(safeAssetName('x".png') === "nothing", "safeAssetName rejects quotes");
assert(safeAssetName("../secret") === "nothing", "safeAssetName rejects path traversal");
assert(safeAssetName("a/b") === "nothing", "safeAssetName rejects separators");
assert(safeAssetPath("words/en/about.png") === "words/en/about.png", "safeAssetPath keeps segmented paths");
assert(safeAssetPath("../etc/passwd") === "nothing.png", "safeAssetPath rejects .. segments");
assert(safeAssetPath("/absolute.png") === "nothing.png", "safeAssetPath rejects leading slash");

console.log("verify-html-escape: ok");
