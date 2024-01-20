/// <reference types="https://esm.sh/@types/dom-navigation" />

import type { RepoPath } from "../lib/call_gh_api.ts"

/** `content_script`s cannot import through esm module import syntax.
 * thus, we have to resort to dynamic `import()` function, which must be awaited.
 * so, for that, we have to create an async iife to execute the script.
 * furthermore, the imported script MUST have external-resource security clearance to be imported here.
 * for that, we have to specify in "manifest.json": `web_accessible_resources = [{resources: ["*.js"], matches: "<all_urls>"}]`.
 * which is basically saying: javacript within "<all_urls>" in this extension can load the resource url_pattern "*.js" (all javascript files).
*/
// import { getCurrentRepoPath, RepoPath } from "../lib/call_gh_api.ts"
// import { addSizeButton } from "../lib/modify_ui.ts"

declare global {
	const navigation: Navigation
}

const reserved_owners = new Set([
	undefined, "", "settings", "notifications", "pulls", "issues", "projects", "orgs", "github", "readme",
	"discussions", "codespaces", "explore", "marketplace", "sponsors", "account", "organizations", "logout", "about",
	"features", "enterprise", "copilot", "security", "pricing", "team", "premium-support", "customer-stories", "github-copilot",
])
const reserved_repos = new Set([undefined, ""])
const reserved_subpaths = new Set(["issues", "pulls", "actions", "projects", "wiki", "security", "pulse", "settings"])

const run_content_script = (async () => {
	const
		{ getCurrentRepoPath } = await import("../lib/call_gh_api.ts"),
		{ addSizeButton } = await import("../lib/modify_ui.ts")

	const onPageReload = () => {
		const repo_path: Partial<RepoPath> = getCurrentRepoPath()
		if (
			!reserved_owners.has(repo_path.owner) &&
			!reserved_repos.has(repo_path.repo) &&
			!reserved_subpaths.has(repo_path.subpath?.split("/")[0] as any)
		) {
			addSizeButton()
		}
	}

	navigation.addEventListener("navigate", onPageReload)
	onPageReload()
})()
