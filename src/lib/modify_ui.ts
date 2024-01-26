import { config, debounceAndShare, humanReadableBytesize, memorize, modifyElementStyleTemporarily, number_isFinite, storage } from "./deps.ts"
import { GraphQLAPI } from "./gh_graphql_api.ts"
import { RestAPI } from "./gh_rest_api.ts"
import { FolderSizeInfo, getCurrentURL } from "./typedefs.ts"

export const getDirectoryTableDOM = memorize((): HTMLTableElement => {
	return document.querySelector("#folders-and-files + table") as HTMLTableElement
}) as (() => HTMLTableElement)

const injected_cell_id_prefix = "github-aid_"
export const siteIsRepoHomepage = (): boolean => {
	const first_visible_row = getDirectoryTableDOM().querySelector("tbody")?.firstElementChild
	return first_visible_row?.id?.startsWith("folder-row-") ?
		false :
		first_visible_row?.querySelector(`td[id ^= "${injected_cell_id_prefix}" i]`) ?
			false :
			true
}

let rows_injected = 0
const injectButtonInTableRow = (button_text: string = "", cell_id: string = "", row_number = 0, column_span = 3): HTMLButtonElement => {
	const
		table_body = getDirectoryTableDOM().querySelector("tbody")!,
		// row_dom = document.createElement("tr"),
		cell_dom = document.createElement("td"),
		button_dom = document.createElement("button")
	let row_dom: HTMLTableRowElement
	if (rows_injected <= row_number) {
		// we need to create a new row, since currently no injected row of the designated `row_number` has been added yet
		// our operation of this function relies on being called in a sequence of incrementing max `row_number`.
		// skipping in between values will result in incorrect row placements. here are examples of correct usage vs incorrect (`fn` = this function)
		// correct: `fn(0); fn(1); fn(0); fn(2); fn(0); fn(2); fn(1)`, incorrect: `fn(0); fn(2) /* you skipped 1 */; fn(3); fn(0); fn(5) /* you skipped 4 */`
		row_dom = document.createElement("tr")
		// in the repo's homepage (where the readme is displayed), the top row is occupied by the "last commit" info along with total commits
		// because we wish to put our row under it, we increment `row_number` by one if we're currently at the homepage
		row_number += siteIsRepoHomepage() ? 1 : 0
		table_body.insertBefore(row_dom, table_body.children[row_number])
		rows_injected++
	} else {
		// an inject row already exists where the new cell's placement has been requested. we'll simply load that into `row_dom`
		// see comment above (in the "if true" block) that explains why `row_number` needs to be incremented in the homepage.
		row_number += siteIsRepoHomepage() ? 1 : 0
		row_dom = table_body.rows[row_number]
	}
	cell_dom.id = injected_cell_id_prefix + cell_id
	button_dom.innerHTML = button_text
	button_dom.setAttribute("style", "width: 100%; height: 2em;")
	cell_dom.setAttribute("colspan", column_span.toString())
	row_dom.appendChild(cell_dom).appendChild(button_dom)
	return button_dom
}

export const injectSizeButton = (row_number?: number, column_span?: number) => {
	const
		feature_name: keyof typeof config["features"] = "size",
		button_dom = injectButtonInTableRow(config.features[feature_name].buttonText, feature_name, row_number, column_span)
	button_dom.onclick = debounceAndShare(1000, previewSizes)
}

export const injectDownloadButton = (row_number?: number, column_span?: number) => {
	const
		feature_name: keyof typeof config["features"] = "download",
		button_dom = injectButtonInTableRow(config.features[feature_name].buttonText, feature_name, row_number, column_span)
	// button_dom.onclick = TODO
	button_dom.onclick = () => {
		button_dom.innerText = "coming soon\u{2122}"
		modifyElementStyleTemporarily(button_dom, 2000, "background-color: red;")
	}
}

export const injectDiskspaceButton = (row_number?: number, column_span?: number) => {
	const
		feature_name: keyof typeof config["features"] = "diskspace",
		button_dom = injectButtonInTableRow(config.features[feature_name].buttonText, feature_name, row_number, column_span)
	button_dom.onclick = () => { previewDiskspace(button_dom) }
}

class DirectoryEntry {
	name: string
	dom: HTMLTableRowElement

	/**
	 * @param dom_element corresponds to the table-row element of a single folder/file entry
	*/
	constructor(dom_element: HTMLTableRowElement) {
		this.dom = dom_element
		this.name = this.parseName()
	}

	private parseName() {
		const
			displayed_name = (this.dom.querySelector("div:first-child") as HTMLElement).innerText,
			// folders with exactly one subfolder are displayed as "folder/subfolder" (for example ".github/workflows" is quite common).
			// in that case, we need to get the actual name of the entry, which precedes the slash ("/").
			// in summary, "folder/subfolder" will get parsed as "folder", and ".github/workflows" will be parsed as ".github", as it should be
			actual_name = displayed_name.split("/", 1)[0]
		return actual_name
	}

	setSize(bytesize: number) {
		const table_cell = this.dom.querySelector("td > div.react-directory-commit-age")!
		table_cell.innerHTML = humanReadableBytesize(bytesize)
	}

	static parseCurrentPage(): Map<string, DirectoryEntry> {
		const
			rows: Iterable<HTMLTableRowElement> = getDirectoryTableDOM().querySelectorAll(`tbody > tr[id ^= "folder-row-" i]`) as any,
			entries_arr: DirectoryEntry[] = [...rows].map((elem) => new DirectoryEntry(elem)),
			entries = new Map<string, DirectoryEntry>(entries_arr.map((entry) => [entry.name, entry]))
		return entries
	}
}

export const previewSizes = async (event: MouseEvent) => {
	const
		entries = DirectoryEntry.parseCurrentPage(),
		url = getCurrentURL(),
		github_auth_token = await storage.get("githubToken"),
		api_caller = (await storage.get("apiMethod")) === "graphql" ?
			new GraphQLAPI(url, github_auth_token ?? "") :
			new RestAPI(url, github_auth_token),
		recursion_depth = await storage.get("recursionLimit"),
		folder_pathname = api_caller.parseEntryPath(url)
	if (folder_pathname === undefined) {
		throw Error("failed to parse the folder_pathname from current url")
	}
	let folder_size_info: FolderSizeInfo | undefined
	// fetching might occasionally fail, so we need to add an error catch block for that
	try {
		folder_size_info = await api_caller.getFolderSizeInfo(folder_pathname, { recursion: recursion_depth })
	} catch (error) {
		// turn the "size" button red in order to indicate a failure while fetching
		modifyElementStyleTemporarily(event.target as HTMLButtonElement, 500, "background-color: red;")
		console.log(error)
	}
	// for each retrieved file info, find the DOM table row associated with that file name (if it exists),
	// and then change the text of the "last commit date" to the file size
	folder_size_info?.forEach((size_entry) => {
		entries.get(size_entry.name)?.setSize(size_entry.size)
	})
	// finally, change the table header's "Last commit date" cell to read "Size"
	const header_cell_dom = getDirectoryTableDOM().querySelector(`thead > tr > th > div[title ^= "last commit date" i]`) as (HTMLDivElement | null)
	if (header_cell_dom) {
		header_cell_dom.innerText = "Size"
	}
}

export const previewDiskspace = async (text_element: HTMLElement) => {
	const
		url = getCurrentURL(),
		github_auth_token = await storage.get("githubToken"),
		api_caller = (await storage.get("apiMethod")) === "graphql" ?
			new GraphQLAPI(url, github_auth_token ?? "") :
			new RestAPI(url, github_auth_token)
	let total_bytesize: number | undefined
	// fetching might occasionally fail, so we need to add an error catch block for that
	try {
		total_bytesize = await api_caller.getDiskspace()
	} catch (error) {
		// turn the "download" button red in order to indicate a failure while fetching
		modifyElementStyleTemporarily(text_element, 500, "background-color: red;")
		console.log(error)
	}
	text_element.innerText = number_isFinite(total_bytesize) ? humanReadableBytesize(total_bytesize!) : "failed"
}
