export { array_isArray, object_entries } from "https://deno.land/x/kitchensink_ts@v0.7.3/builtin_aliases_deps.ts"
export { debounceAndShare, memorize } from "https://deno.land/x/kitchensink_ts@v0.7.3/lambda.ts"
export { clamp, sum } from "https://deno.land/x/kitchensink_ts@v0.7.3/numericmethods.ts"

import { array_isEmpty } from "https://deno.land/x/kitchensink_ts@v0.7.3/builtin_aliases_deps.ts"
import { max } from "https://deno.land/x/kitchensink_ts@v0.7.3/numericmethods.ts"

// @deno-types="npm:web-ext-types"
declare const chrome: typeof browser
export const getBrowser = () => {
	const possible_browser = typeof browser !== "undefined" ?
		browser :
		typeof chrome !== "undefined" ?
			chrome :
			undefined
	return possible_browser?.runtime ? possible_browser : undefined
}

const math_random = Math.random

const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]

/** format bytesizes into readable sizes.
 * note that the magnitude of a "killo" is defined as `1024`, and not SI standard `1000`. <br>
 * examples:
 * |      in     |     out     |
 * |:-----------:|:-----------:|
 * |    12000    | "11.72 KiB" |
 * | 1.6*1000000 |  "1.53 MiB" |
*/
export const humanReadableBytesize = (bytesize: number): string => {
	let i = 0
	while (bytesize > 1024 ** i) { i++ }
	i = i <= 0 ? 0 : i - 1
	const
		unit = units[i],
		bytesize_in_unit = (bytesize / (1024 ** i)).toFixed(2)
	return bytesize_in_unit + " " + unit
}

/** removes leading (starting position) slashes "/" and dot slashes "./" . <br>
 * examples:
 * |            in            |          out         |
 * |:------------------------:|:--------------------:|
 * | "./././hello/world.txt"  | "hello/world.txt"    |
 * | "////hello/world.txt"    | "hello/world.txt"    |
 * | "//././/hello/world.txt" | "hello/world.txt"    |
 * | ".hello/world.txt"       | ".hello/world.txt"   |
 * | "/.hello/world.txt"      | ".hello/world.txt"   |
 * | "../hello/world.txt"     | "../hello/world.txt" |
*/
export const removeLeadingSlash = (str: string): string => {
	return str.replace(/^(\/|\.\/)*/, "")
}

/** shuffle an array via mutation. the ordering of elements will be randomized by the end. */
export const shuffleArray = <T>(arr: Array<T>): Array<T> => {
	const
		len = arr.length,
		rand_int = () => (math_random() * len) | 0,
		swap = (i1: number, i2: number) => {
			const temp = arr[i1]
			arr[i1] = arr[i2]
			arr[i2] = temp
		}
	for (let i = 0; i < len; i++) swap(i, rand_int())
	return arr
}

/** a generator that yields random selected non-repeating elements out of an array.
 * once the all elements have been yielded, a cycle has been completed.
 * after a cycle is completed the iterator resets to a new cycle, yielding randomly selected elements once again.
 * the ordering of the randomly yielded elements will also differ from compared to the first time. <br>
 * moreover, you can call the iterator with an optional number argument that specifies if you wish to skip ahead a certain number of elements.
 * - `1`: go to next element (default behavior)
 * - `0`: receive the same element as before
 * - `-1`: go to previous next element
 * - `+ve number`: skip to next `number` of elements
 * - `-ve number`: go back `number` of elements
 * 
 * note that once a cycle is complete, going back won't restore the correct element from the previous cycle, because the info about the previous cycle gets lost.
*/
export const shuffledDeque = function* <T>(arr: Array<T>): Generator<T, void, number | undefined> {
	let i = arr.length // this is only temporary. `i` immediately becomes `0` when the while loop begins
	while (!array_isEmpty(arr)) {
		if (i >= arr.length) {
			i = 0
			shuffleArray(arr)
		}
		i = max(i + ((yield arr[i]) ?? 1), 0)
	}
}

/** a unified non-failing way of storing simple json style key value pairs in either (ordered by priority):
 * - your local storage (see [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API))
 * - a temporary `Map` object, which will be valid throughout the lifetime of your script
*/
class SimpleStorage<SCHEMA> {
	private temp: Map<keyof SCHEMA, SCHEMA[keyof SCHEMA]> = new Map()

	async get<K extends keyof SCHEMA>(key: K): Promise<SCHEMA[K]> {
		const browser = getBrowser()
		if (browser) {
			return (await browser.storage.sync.get(key as any) as SCHEMA)[key]
		}
		return this.temp.get(key) as SCHEMA[K]
	}

	async set<K extends keyof SCHEMA>(key: K, value: SCHEMA[K]): Promise<void> {
		const browser = getBrowser()
		if (browser) {
			await browser.storage.sync.set({
				[key]: value as any
			})
		} else {
			this.temp.set(key, value)
		}
	}
}

export interface StorageSchema {
	githubToken?: string
	apiMethod?: "rest" | "graphql"
	recursionLimit?: number
}


export const storage = new SimpleStorage<StorageSchema>()

/** this corresponds to the "src_extension" folder. this compiled javascript file is initially located in "src_extension/js/" */
const root_dir = getBrowser() ? new URL("./", getBrowser()!.runtime.getURL("./")) : new URL("../", import.meta.url)
export const config = {
	dir: {
		root: new URL("./", root_dir),
		images: new URL("./images/", root_dir),
		icon: new URL("./icon/", root_dir),
		js: new URL("./js/", root_dir),
	},
	api: {
		"rest": "https://api.github.com/repos",
		"graphql": "https://api.github.com/graphql",
	}
}

// - [x] TODO: add option for setting recursion folder amount
// - [x] TODO: add option for branch selection for rest api (you'll have to use the "tree" rest api instead of "repository")
// - [] TODO: add option feature for checking total repo size, including the ui associated with it
// - [] TODO: add option toggling which ui elements/buttons get injected onto the page
// - [] TODO: implement downloading files feature. you will also need to add a separate control for the amount of permitted recursions
// - [] TODO: develop a ".tar" file encoder and decoder
// - [] TODO: add ui associated with the download feature
// - [x] TODO: fix the cropping of the `option.html` page when rendered as a popup page
// - [] TODO: replace `eldercat.svg` with a katana wielding seppukucat with a samurail man bun
// - [] TODO: add option to choose whether to strictly adhere to REST api in incognito mode, along with no authentication key
// - [x] TODO: ISSUE: folders with only one subfolder (and no files) are previewed as "folder/subfolder" in the github table-view ui.
//            as a result, I am unable to match the retrieved folder sizes with the associated table row, since the table row is identified by the name "folder/subfolder",
//            where as the folder sizes has it stored as the key "folder".
//            potential fix: make table rows be identifiable by the name string before any slashes ("/")
