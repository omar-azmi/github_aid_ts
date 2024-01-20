import { array_isArray } from "./deps.ts"

export interface RepoPath {
	owner: string
	repo: string
	/** i can't handle the different branches besides the "HEAD" when using the REST API.
	 * i will probably want to use the the GraphQL API for that.
	*/
	branch: string
	subdir?: string
	subpath: string
}

export interface SizeInfo {
	/** bytesize of the item (which can be a repo, file, or a directory) */
	name: string
	/** bytesize of the item */
	size: number
	/** children under this item */
	children?: SizeInfo[]
}

export const getCurrentRepoPath = (): RepoPath => {
	const
		pathname = window.location.pathname,
		path = pathname.split("/")
	if (path[0] === "") { path.shift() }
	if (path.length < 2) { console.warn("failed to parse the repository's location from the current url:", pathname) }
	return {
		owner: path.shift()!,
		repo: path.shift()!,
		subpath: path.join("/"),
		branch: path[0] === "tree" ? (path.shift() && false) || path.shift()! : "HEAD",
		subdir: path.join("/")
	}
}

export const getRepoSizeInfo = async (repo_path: RepoPath): Promise<SizeInfo> => {
	const
		{ repo, branch, owner, subdir } = repo_path,
		repo_info = await (await fetch(`https://api.github.com/repos/${owner}/${repo}`)).json(),
		repo_size_info: SizeInfo = {
			name: repo_info.name,
			size: repo_info.size * 1024, // `repo.size` is actually in kilobytes instead of bytes, so we need to convert it for consistency
		},
		contents = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${subdir}`)).json()

	if (array_isArray(contents)) {
		repo_size_info.children = contents.map(item => ({
			name: item.name,
			size: item.size,
		}))
	}

	return repo_size_info
}
