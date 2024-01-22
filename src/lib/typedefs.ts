export interface RepoPath {
	owner: string
	repo: string
	/** i can't handle the different branches besides the "HEAD" when using the REST API.
	 * i will probably want to use the the GraphQL API for that.
	 * TODO: consider using branch-hash instead of branch-name,
	 * and then create helper functions/methods that parse the branch-hash from either a branch-name or branch-tag, or commit-tag
	*/
	branch: string | "HEAD"
}

export interface RepoEntryPath extends RepoPath {
	/** a directory entry's full path, relative to the root of the repo. */
	path: string
	/** contains the full path following the repo name.
	 * this includes the possibility of tree/branch names,
	 * or even something unrelated to the contents of the repo, such as repo settings.
	*/
	fullpath: string
}

/** a single directory entry's bytesize information.
 * directory entry is either a file or a folder.
*/
export interface EntrySizeInfo {
	/** name of the directory entry */
	name: string
	/** bytesize of the directory entry */
	size: number
}

export type FolderSizeInfo = Array<EntrySizeInfo>

export interface GetFolderSizeInfo_Options {
	recursive?: boolean | number
}

export const getCurrentURL = () => {
	return new URL(window.location.href)
}

export const parseRepoEntryPath = (url: URL): RepoEntryPath | undefined => {
	const
		pathname = url.pathname,
		path = pathname.split("/")
	if (path[0] === "") { path.shift() }
	if (path.length < 2) {
		console.log("failed to parse the repository's location from the current url:", pathname)
		return undefined
	}
	return {
		owner: path.shift()!,
		repo: path.shift()!,
		fullpath: path.join("/"),
		branch: path[0] === "tree" ? (path.shift() && false) || path.shift()! : "HEAD",
		path: path.join("/")
	}
}

export abstract class GithubAPI {
	repo: RepoPath
	auth?: string

	constructor(github_repo_url: URL, authentication_token?: string) {
		const { owner, repo, branch } = parseRepoEntryPath(github_repo_url)!
		this.repo = { owner, repo, branch }
		this.auth = authentication_token
	}

	parseEntryPath(github_repo_subpath_url: URL): RepoEntryPath["path"] | undefined {
		const
			parsed_repo = parseRepoEntryPath(github_repo_subpath_url),
			this_repo = this.repo
		if (!parsed_repo) { return undefined }
		// each key-value pair of `this_repo` must match with `parsed_repo`, otherwise it means that either the
		// `owner` is different, or `repo` is different, or the `branch` is different.
		// and we should therefore not parse it as though it contains a valid sub `path` of the current repository (`this_repo`).
		for (const key in this_repo) {
			if (parsed_repo[key as keyof RepoPath] !== this_repo[key as keyof RepoPath]) {
				return undefined
			}
		}
		return parsed_repo.path
	}

	abstract getFolderSizeInfo(folder_pathname: string, options?: GetFolderSizeInfo_Options): Promise<FolderSizeInfo>

	/** get the bytesize of the whole repository */
	abstract getRepoSize(): Promise<number>

	/** get the bytesize of the specific branch of the repository */
	abstract getBranchSize(): Promise<number>

	abstract fetchEntriesOfFolder(folder_pathname: string, ...sub_entries: string[]): Promise<Uint8Array>
}
