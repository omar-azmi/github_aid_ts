import { debounceAndShare, humanReadableBytesize, memorize, your_github_auth_token } from "./deps.ts"
import { GraphQLAPI } from "./gh_graphql_api.ts"
import { RestAPI } from "./gh_rest_api.ts"
import { getCurrentURL } from "./typedefs.ts"

export const getDirectoryTableDOM = memorize((): HTMLTableElement => {
	return document.querySelector("#folders-and-files + table") as HTMLTableElement
}) as (() => HTMLTableElement)

export const siteIsRepoHomepage = (): boolean => {
	return getDirectoryTableDOM().querySelector("tbody")?.firstElementChild?.id?.startsWith("folder-row-") ? false : true
}

export const addHomepageSizeButton = (): boolean => {
	// TODO: show total repo size. however, I would first like to uncouple how the total repo size get fetched along with the subdir's content's sizes.
	// these two should be processes, rather than one. i.e.: `getRepoSizeInfo` should be exclusive to total repo size, and a new `getSubdirSizeInfo` function should handle subdirs instead.
	// it would suck to call `getRepoSizeInfo` twice, only to discard half of the info each time.
	throw Error()
}

const injectButtonInTopRow = (button_text: string = "", row_id: string = "github_aid"): HTMLButtonElement => {
	const
		table_body = getDirectoryTableDOM().querySelector("tbody")!,
		row_dom = document.createElement("tr"),
		cell_dom = document.createElement("td"),
		button_dom = document.createElement("button")
	row_dom.id = row_id
	button_dom.innerHTML = button_text
	button_dom.setAttribute("style", "width: 100%;")
	cell_dom.setAttribute("colspan", "3")
	row_dom.appendChild(cell_dom).appendChild(button_dom)
	table_body.insertBefore(row_dom, table_body.children[siteIsRepoHomepage() ? 1 : 0])
	return button_dom
}

export const injectSizeButton = (): boolean => {
	const already_exists = getDirectoryTableDOM().querySelector("tbody > #github_aid_size") ? true : false
	if (!already_exists) {
		const button_dom = injectButtonInTopRow("get content sizes", "github_aid_size")
		button_dom.onclick = debounceAndShare(1000, previewSizes)
		return true
	}
	return false
}

export const injectDownloadButton = (): boolean => {
	const already_exists = getDirectoryTableDOM().querySelector("tbody > #github_aid_download") ? true : false
	if (!already_exists) {
		const button_dom = injectButtonInTopRow("toggle download selected", "github_aid_download")
		// button_dom.onclick = TODO
		return true
	}
	return false
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
		return (this.dom.querySelector("div:first-child") as HTMLElement).innerText
	}

	setSize(bytesize: number) {
		const table_cell = this.dom.querySelector("td > div.react-directory-commit-age")!
		table_cell.innerHTML = humanReadableBytesize(bytesize)
	}

	static parseCurrentPage(): Map<string, DirectoryEntry> {
		const
			rows: Iterable<HTMLTableRowElement> = getDirectoryTableDOM().querySelectorAll("tbody > tr[id^=\"folder-row-\"]") as any,
			entries_arr: DirectoryEntry[] = [...rows].map((elem) => new DirectoryEntry(elem)),
			entries = new Map<string, DirectoryEntry>(entries_arr.map((entry) => [entry.name, entry]))
		return entries
	}
}

export const previewSizes = async () => {
	const
		entries = DirectoryEntry.parseCurrentPage(),
		url = getCurrentURL(),
		api_caller = new GraphQLAPI(url, your_github_auth_token),
		folder_pathname = api_caller.parseEntryPath(url)!,
		folder_size_info = await api_caller.getFolderSizeInfo(folder_pathname, { recursive: true})
	folder_size_info.forEach((size_entry) => {
		entries.get(size_entry.name)?.setSize(size_entry.size)
	})
}
