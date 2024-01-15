import { getCurrentRepoPath, getRepoSizeInfo } from "./call_gh_api.ts"
import { debounceAndShare, humanReadableBytesize, memorize } from "./deps.ts"

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

export const addSizeButton = (): boolean => {
	const
		table_dom = getDirectoryTableDOM(),
		table_header_dom = table_dom.querySelector("thead > tr")!
	if (!table_dom.querySelector("#size_button_header")) {
		// add the header button, and return `true` for success
		// first we create the following table header element:
		// `<th style="width: 4rem;" id="size_button_header"><button type="button" title="Size">Size</button></th>`
		const
			size_button_header_dom = document.createElement("th"),
			size_button_cell_dom = document.createElement("td"),
			size_button_dom = document.createElement("button")
		size_button_dom.setAttribute("id", "size_button_header")
		size_button_dom.setAttribute("type", "button")
		size_button_dom.setAttribute("style", "width: 100%; padding: 0px; margin: 0px;")
		size_button_dom.setAttribute("title", "Size")
		size_button_dom.innerHTML = "Size"
		size_button_dom.onclick = debounceAndShare(1000, () => {
			// make the table column correspondig to size longer now that the user has clicked on the button.
			// this ensures that the rows do not expand due to the text of the individual bytesizes, resulting in a linebreak in each row.
			size_button_header_dom.setAttribute("style", "width: 6rem;")
			return previewSizes()
		})
		size_button_header_dom.setAttribute("style", "width: 3rem;")
		table_header_dom.appendChild(size_button_header_dom)
		if(siteIsRepoHomepage()) {
			size_button_cell_dom.appendChild(size_button_dom)
			table_dom.querySelector("tbody > tr")!.appendChild(size_button_cell_dom)
		} else {
			size_button_header_dom.appendChild(size_button_dom)
		}
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

export const getCurrentDirectoryEntries = (): Map<string, DirectoryEntry> => {
	const
		rows: Iterable<HTMLTableRowElement> = getDirectoryTableDOM().querySelectorAll("tbody > tr[id^=\"folder-row-\"]") as any,
		entries_arr: DirectoryEntry[] = [...rows].map((elem) => new DirectoryEntry(elem)),
		entries = new Map<string, DirectoryEntry>(entries_arr.map((entry) => [entry.name, entry]))
	return entries
}

export const previewSizes = async () => {
	const
		entries = getCurrentDirectoryEntries(),
		size_info = await getRepoSizeInfo(getCurrentRepoPath())
	size_info.children?.forEach((size_entry) => {
		entries.get(size_entry.name)?.setSize(size_entry.size)
	})
}
