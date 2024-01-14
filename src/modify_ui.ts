import { getCurrentRepoPath, getRepoSizeInfo } from "./call_gh_api.ts"
import { humanReadableBytesize, memorize } from "./deps.ts"

export const getDirectoryTableDOM = memorize((): HTMLTableElement => {
	return document.querySelector("[aria-labelledby=\"folders-and-files\"]") as HTMLTableElement
}) as (() => HTMLTableElement)

export const addSizeButton = (): boolean => {
	const table_header_dom = getDirectoryTableDOM().querySelector("thead > tr")!
	if (table_header_dom.lastElementChild?.id !== "size_button_header") {
		// add the header button, and return `true` for success
		// first we create the following table header element:
		// `<th style="width: 4rem;" id="size_button_header"><button type="button" title="Size">Size</button></th>`
		const
			size_button_header_dom = document.createElement("th"),
			size_button_dom = document.createElement("button")
		size_button_header_dom.appendChild(size_button_dom)
		size_button_header_dom.setAttribute("id", "size_button_header")
		size_button_header_dom.setAttribute("style", "width: 4rem;")
		size_button_dom.setAttribute("type", "button")
		size_button_dom.setAttribute("title", "Size")
		size_button_dom.innerHTML = "Size"
		table_header_dom.appendChild(size_button_header_dom)
		size_button_dom.onclick = previewSizes
		return true
	}
	return false
}

class DirectoryEntry {
	name: string
	dom: HTMLTableRowElement

	constructor(dom_element: HTMLTableRowElement) {
		this.dom = dom_element
		this.name = this.getName()
	}

	private getName() {
		return (this.dom.querySelector("div:first-child") as HTMLElement).innerText
	}

	setSize(bytesize: number) {
		let table_cell = this.dom.lastElementChild
		if (!table_cell || !table_cell.classList.contains("directory_size")) {
			table_cell = document.createElement("td")
			table_cell.classList.add("directory_size")
			this.dom.appendChild(table_cell)
		}
		table_cell.innerHTML = `<div>${humanReadableBytesize(bytesize)}</div>`
	}
}

export const getCurrentDirectoryEntries = memorize((): Map<string, DirectoryEntry> => {
	const
		rows: Iterable<HTMLTableRowElement> = getDirectoryTableDOM().querySelectorAll("tbody > tr[id^=\"folder-row-\"]") as any,
		entries_arr: DirectoryEntry[] = [...rows].map((elem) => new DirectoryEntry(elem)),
		entries = new Map<string, DirectoryEntry>(entries_arr.map((entry) => [entry.name, entry]))
	return entries
}) as () => Map<string, DirectoryEntry>

export const previewSizes = async () => {
	const
		entries = getCurrentDirectoryEntries(),
		size_info = await getRepoSizeInfo(getCurrentRepoPath())
	size_info.children?.forEach((size_entry) => {
		entries.get(size_entry.name)?.setSize(size_entry.size)
	})
}
