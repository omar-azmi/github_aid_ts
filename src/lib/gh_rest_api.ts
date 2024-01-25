import { array_isArray, config, number_isFinite, object_entries, removeLeadingSlash } from "./deps.ts"
import { FolderSizeInfo, GetFolderSizeInfo_Options, GithubAPI } from "./typedefs.ts"

interface RestTreeResponse {
	sha: string
	truncated: boolean
	url: string
	tree: Array<RestTreeEntry>
}

interface RestTreeEntry {
	path: string
	mode: string
	type: "tree" | "blob" | "submodule" | "symlink"
	sha: string
	url: string
	size?: number
}


export class RestAPI extends GithubAPI {
	async getFolderSizeInfo(folder_pathname: string, options: GetFolderSizeInfo_Options = {}): Promise<FolderSizeInfo> {
		folder_pathname = removeLeadingSlash(folder_pathname)
		const
			{ owner, repo, branch } = this.repo,
			recursion_query = ((options.recursion ?? 1) > 1) ? "recursive=true" : "",
			reqest_header_auth: { authorization: string } | {} = this.auth ? { "authorization": `bearer ${this.auth}` } : {},
			// we first need to fetch the tree's associated SHA1 hash value.
			// for this, it is crucial that we use the header `{ "accept": "application/vnd.github.object" }`,
			// otherwise the standard json response will not contain the SHA1 info (it'll just be a plain array of child content entries).
			folder_tree_sha1 = (await (
				await fetch(config.api.rest + `/${owner}/${repo}/contents/${folder_pathname}?ref=${branch}`, {
					method: "GET",
					headers: { "accept": "application/vnd.github.object", ...reqest_header_auth },
				})
			).json())["sha"] as (string | undefined)
		if (!folder_tree_sha1) {
			throw Error("failed to fetch folder's tree SHA1.\n\tfetch reuest was made for folder_pathname: " + folder_pathname)
		}
		// with the folder's SHA1 info at hand, we can request the info on all deeply nested directory and file entries.
		// the `recursion_query` specifies whether or not deep entries should be reported back. if it's not there, only direct entries of the folder are reported.
		const folder_deep_contents: RestTreeResponse["tree"] = (await (
			await fetch(config.api.rest + `/${owner}/${repo}/git/trees/${folder_tree_sha1}?${recursion_query}`, {
				method: "GET",
				headers: { "accept": "application/vnd.github+json", ...reqest_header_auth },
			})
		).json())["tree"]
		if (!array_isArray(folder_deep_contents)) {
			throw Error("failed to fetch folder contents in correct format.\n\tfetch reuest was made for folder_pathname: " + folder_pathname + "\n\twith folder tree SHA1: " + folder_tree_sha1)
		}
		// we now need to sum the bytesizes of all deeply nested entries into the top subfolder's size
		const folder_content_sizes: { [entry_name: string]: number } = {}
		folder_deep_contents.forEach((deep_entry) => {
			const
				// the top subfolder or file's name always preceeds the first "/" (if there's any)
				top_dir_or_file_name = deep_entry.path.split("/", 1)[0],
				deep_entry_size = deep_entry.size ?? 0
			folder_content_sizes[top_dir_or_file_name] ??= 0
			folder_content_sizes[top_dir_or_file_name] += deep_entry_size
		})
		return object_entries(folder_content_sizes).map(([entry_name, bytesize]) => ({
			name: entry_name,
			size: bytesize,
		}))
	}

	async getDiskspace(): Promise<number> {
		const
			{ owner, repo } = this.repo,
			reqest_header_auth: { authorization: string } | {} = this.auth ? { "authorization": `bearer ${this.auth}` } : {},
			repo_info = await (
				await fetch(config.api.rest + `/${owner}/${repo}`, {
					method: "GET",
					headers: reqest_header_auth
				}).then((response) => { return response.ok ? response : new Response("{}") })
			).json()
		if (!number_isFinite(repo_info.size)) {
			throw Error("failed to fetch the repository's size in the correct format.\n\tfetched response was: " + repo_info)
		}
		return repo_info.size * 1024 // `repo.size` is actually in kilobytes instead of bytes, so we need to convert it to bytes
	}

	fetchEntriesOfFolder(folder_pathname: string, ...sub_entries: string[]): Promise<Uint8Array> {
		throw new Error("Method not implemented.")
	}
}
