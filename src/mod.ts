/// <reference types="https://esm.sh/@types/dom-navigation" />

import { getCurrentRepoPath, RepoPath } from "./call_gh_api.ts"
import { addSizeButton } from "./modify_ui.ts"
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
