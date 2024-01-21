import { array_isArray } from "./deps.ts"
import { FolderSizeInfo, GithubAPI } from "./typedefs.ts"

export class RestAPI extends GithubAPI {
	async getFolderSizeInfo(folder_pathname: string): Promise<FolderSizeInfo> {
		// TODO: what about branch selection?
		const
			{ owner, repo } = this.repo,
			folder_contents = await (await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folder_pathname}`)).json()
		if (!array_isArray(folder_contents)) {
			throw Error("failed to fetch folder contents in correct format. fetch reuest was made for folder_pathname: " + folder_pathname)
		}
		return folder_contents.map(folder_entry => ({
			name: folder_entry.name,
			size: folder_entry.size,
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
