/// <reference types="https://esm.sh/@types/dom-navigation" />

import { dom_setTimeout, storage } from "../lib/deps.ts"
import { injectDiskspaceButton, injectDownloadButton, injectSizeButton } from "../lib/modify_ui.ts"
import { getCurrentURL, parseRepoEntryPath } from "../lib/typedefs.ts"

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

const runMain = async () => {
	const repo_path = parseRepoEntryPath(getCurrentURL())
	if (
		repo_path &&
		!reserved_owners.has(repo_path.owner) &&
		!reserved_repos.has(repo_path.repo) &&
		!reserved_fullpaths.has(repo_path.fullpath?.split("/")[0])
	) {
		const layout = await storage.get("layout")
		layout.forEach((layout_row, row_number) => {
			layout_row?.forEach((layout_cell, column_number) => {
				const { feature, span } = layout_cell ?? {}
				switch (feature) {
					case "size": {
						injectSizeButton(row_number, span)
						break
					} case "download": {
						injectDownloadButton(row_number, span)
						break
					} case "diskspace": {
						injectDiskspaceButton(row_number, span)
						break
					}
					default: { break }
				}
			})
		})
	}
}

// BUG: firefox currently does not support `Navigation API`
if (typeof navigation !== "undefined") {
	navigation.addEventListener("navigatesuccess ", () => dom_setTimeout(runMain, 300))
}

// all content_scripts are loaded after the `DOMContentLoaded` event. therefore, we should run the script at top level
runMain()
