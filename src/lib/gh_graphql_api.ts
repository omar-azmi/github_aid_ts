import { array_isArray, config, memorize, removeLeadingSlash, sum } from "./deps.ts"
import { FolderSizeInfo, GetFolderSizeInfo_Options, GithubAPI } from "./typedefs.ts"

interface GraphQLResponse<T> {
	data: T
	errors?: Array<{ message: string }>
}

type GraphQLRepositoryFileEntry = {
	name: string
	object: { byteSize: number }
}
type GraphQLRepositoryFolderEntry = {
	name: string,
	object: {
		entries: Array<GraphQLRepositoryFileEntry | GraphQLRepositoryFolderEntry>
	}
}
type GraphQLRepositoryData = { repository: GraphQLRepositoryFolderEntry }
const create_recursive_query = memorize((depth: number = 1) => {
	let top_string_stack = `
	query GetSubdirContents($owner: String!, $repo: String!, $branch_colon_path: String!) {
		repository(owner: $owner, name: $repo) {
			name
			object(expression: $branch_colon_path) {`
	let botton_string_stack = `
			}
		}
	}`
	while (depth-- > 0) {
		top_string_stack += `
				... on Tree {
					entries {
						name
						object {
							... on Blob {
								byteSize
							}`
		botton_string_stack += `
						}
					}
				}`
	}
	return (top_string_stack + botton_string_stack).trim().replaceAll(/\n\t*/g, " ")
})

type GraphQLRepositoryDiskspaceData = { repository: { diskUsage: number } }
const create_diskspace_query = () => {
	return `
	query GetDiskspace($owner: String!, $repo: String!) {
		repository(owner: $owner, name: $repo) {
			diskUsage
		}
	}`.trim().replaceAll(/\n\t*/g, " ")
}

export class GraphQLAPI extends GithubAPI {
	declare auth: string

	constructor(github_repo_url: URL, authentication_key: string) {
		super(github_repo_url, authentication_key)
	}

	async getFolderSizeInfo(folder_pathname: string, options: GetFolderSizeInfo_Options = {}): Promise<FolderSizeInfo> {
		folder_pathname = removeLeadingSlash(folder_pathname)
		const
			{ owner, repo, branch } = this.repo,
			branch_colon_path = branch + ":" + folder_pathname,
			reqest_header: HeadersInit = {
				"content-type": "application/json",
				"accept": "application/vnd.github+json",
				"authorization": `bearer ${this.auth}`,
			},
			response = await (await fetch(config.api.graphql, {
				method: "POST",
				headers: reqest_header,
				body: JSON.stringify({
					query: create_recursive_query(options.recursion),
					variables: { owner, repo, branch_colon_path }
				}),
			})).json() as GraphQLResponse<GraphQLRepositoryData>
		if (response.errors) {
			const error_messages = response.errors.map((error) => (error.message)).join("\n\t")
			throw Error(`encoutered GraphQL query errors:\n\t${error_messages}`)
		}
		const folder_contents = response.data.repository.object.entries
		const sumup_entry_bytesizes = (file_or_folder_entry: GraphQLRepositoryFolderEntry | GraphQLRepositoryFileEntry): number => {
			const { entries } = (file_or_folder_entry as GraphQLRepositoryFolderEntry).object
			let byteSize = (file_or_folder_entry as GraphQLRepositoryFileEntry).object.byteSize ?? 0
			if (array_isArray(entries)) {
				byteSize += sum(entries.map(sumup_entry_bytesizes))
			}
			return byteSize
		}
		return folder_contents.map(content_entry => ({
			name: content_entry.name,
			size: sumup_entry_bytesizes(content_entry),
		}))
	}

	async getDiskspace(): Promise<number> {
		const
			{ owner, repo } = this.repo,
			reqest_header: HeadersInit = {
				"content-type": "application/json",
				"accept": "application/vnd.github+json",
				"authorization": `bearer ${this.auth}`,
			},
			response = await (await fetch(config.api.graphql, {
				method: "POST",
				headers: reqest_header,
				body: JSON.stringify({
					query: create_diskspace_query(),
					variables: { owner, repo }
				}),
			})).json() as GraphQLResponse<GraphQLRepositoryDiskspaceData>
		if (response.errors) {
			const error_messages = response.errors.map((error) => (error.message)).join("\n\t")
			throw Error(`encoutered GraphQL query errors:\n\t${error_messages}`)
		}
		return response.data.repository.diskUsage * 1024 // `diskUsage` is actually in kilobytes instead of bytes, so we need to convert it to bytes
	}

	fetchEntriesOfFolder(folder_pathname: string, ...sub_entries: string[]): Promise<Uint8Array> {
		throw new Error("Method not implemented.")
	}
}
