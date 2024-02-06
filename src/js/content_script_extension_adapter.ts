/// <reference types="npm:web-ext-types" />

/** `content_script`s cannot import through esm module import syntax.
 * thus, we have to resort to dynamic `import()` in an async context, in addition to awaiting for it.
 * 
 * furthermore, the imported script MUST have external-resource security clearance to be imported here.
 * for that, we have to specify in "manifest.json": `web_accessible_resources = [{resources: ["*.js"], matches: "<all_urls>"}]`.
 * which is basically saying: javascript within "<all_urls>" in this extension can load the resource url_pattern "*.js" (all javascript files).
 * 
 * finally, firefox cannot dynamically import with a relative url (relative to this script's location in the extension's root path).
 * moreover, you cannot use `import.meta.url` to figure out this script's url, because `content_script`s are not loaded as esm modules, but rather as classical scripts.
 * so you have to use `browser.runtime.getURL("/your/module/to_load.js")` with the absolute path of the module (relative to the extension's root url) to get its url.
 * in chromium, this isn't an issue, and you can do relative imports and the browser will understand that it's relative to this script's location in the extension.
 * to summarize here's what's valid:
 * - in chromium: `import("./content_script.ts")`
 *   - esbuild understands dynamic imports when they are a constant string expression, so `./content_script.ts` will also get bundled and transformed automatically
 * - in firefox and chromium: `import(chrome.runtime.getURL("/js/content_script.js"))`
 *   - esbuild cannot evaluate this kind of dynamic string expression, so it will ignore it and leave it as is.
 *   that's why we'll have to reference it through its compiled name instead of the source file name.
*/

declare const chrome: typeof browser
const getBrowser = () => {
	return typeof browser !== "undefined" ? browser : chrome
}

(async () => {
	await import(getBrowser().runtime.getURL("/js/content_script.js"))
})()
