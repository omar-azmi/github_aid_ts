/// <reference types="https://esm.sh/@types/dom-navigation" />

/** `content_script`s cannot import through esm module import syntax.
 * thus, we have to resort to dynamic `import()` function, which must be awaited.
 * so, for that, we have to create an async iife to execute the script.
 * furthermore, the imported script MUST have external-resource security clearance to be imported here.
 * for that, we have to specify in "manifest.json": `web_accessible_resources = [{resources: ["*.js"], matches: "<all_urls>"}]`.
 * which is basically saying: javacript within "<all_urls>" in this extension can load the resource url_pattern "*.js" (all javascript files).
*/
// import { getCurrentURL, parseRepoEntryPath } from "../lib/typedefs.ts"
// import { injectDownloadButton, injectSizeButton } from "../lib/modify_ui.ts"

declare global {
	const navigation: Navigation
}

const reserved_owners = new Set([
	undefined, "", "/", "settings", "notifications", "pulls", "issues", "projects", "orgs", "github", "readme", "discussions",
	"search", "codespaces", "explore", "marketplace", "sponsors", "account", "organizations", "logout", "about",
	"features", "enterprise", "copilot", "security", "pricing", "team", "premium-support", "customer-stories", "github-copilot",
])
const reserved_repos = new Set([undefined, "", "/"])
const reserved_fullpaths = new Set([
	"issues", "pulls", "actions", "projects", "wiki", "security", "settings", "branches", "tags", "releases",
	"pulse", "graphs", "community", "network", "forks", "activity", "stargazers", "watchers", "blob", "edit",
])

const run_content_script = (async () => {
	const
		{ parseRepoEntryPath, getCurrentURL } = await import("../lib/typedefs.ts"),
		{ injectDownloadButton, injectSizeButton } = await import("../lib/modify_ui.ts")

	const onPageReload = () => {
		const repo_path = parseRepoEntryPath(getCurrentURL())
		if (
			repo_path &&
			!reserved_owners.has(repo_path.owner) &&
			!reserved_repos.has(repo_path.repo) &&
			!reserved_fullpaths.has(repo_path.fullpath?.split("/")[0])
		) {
			injectDownloadButton()
			injectSizeButton()
		}
	}

	navigation.addEventListener("navigate", onPageReload)
	onPageReload()
})()
