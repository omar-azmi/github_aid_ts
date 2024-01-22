import { array_isArray } from "./deps.ts"
import { FolderSizeInfo, GetFolderSizeInfo_Options, GithubAPI } from "./typedefs.ts"

export class RestAPI extends GithubAPI {
	async getFolderSizeInfo(folder_pathname: string, options: GetFolderSizeInfo_Options = {}): Promise<FolderSizeInfo> {
		// TODO: what about branch selection?
		// TODO: implement options.recursive for folders. I think you can add a "?recursive=${depth}" to your fetch call for that
		const
			{ owner, repo } = this.repo,
			reqest_header_auth: { authorization: string } | {} = this.auth ? { "authorization": `bearer ${this.auth}` } : {},
			reqest_header: HeadersInit = {
				"accept": "application/vnd.github+json",
				...reqest_header_auth
			},
			folder_contents: FolderSizeInfo & { [key: string]: any } = await (
				await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folder_pathname}`, {
					method: "GET",
					headers: reqest_header,
				})
			).json()
		if (!array_isArray(folder_contents)) {
			throw Error("failed to fetch folder contents in correct format. fetch reuest was made for folder_pathname: " + folder_pathname)
		}
		return folder_contents.map(entry => ({
			name: entry.name,
			size: entry.size,
		}))
	}

	async getRepoSize(): Promise<number> {
		const
			{ owner, repo } = this.repo,
			repo_info = await (await fetch(`https://api.github.com/repos/${owner}/${repo}`)).json()
		return repo_info.size * 1024 // `repo.size` is actually in kilobytes instead of bytes, so we need to convert it to bytes
	}

	async getBranchSize(): Promise<number> {
		// TODO: can the rest api even pick the branch by its name without the use of the branches hash? or is that not possible
		throw new Error("method incorrectly implemented.")
		const
			{ owner, repo, branch } = this.repo,
			branch_info = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/tree/${branch}`)).json()
		return branch_info.size * 1024 // `repo.size` is actually in kilobytes instead of bytes, so we need to convert it to bytes
	}

	fetchEntriesOfFolder(folder_pathname: string, ...sub_entries: string[]): Promise<Uint8Array> {
		throw new Error("Method not implemented.")
	}
}
