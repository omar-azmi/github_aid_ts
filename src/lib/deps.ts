export { array_isArray } from "https://deno.land/x/kitchensink_ts@v0.7.3/builtin_aliases_deps.ts"
export { debounceAndShare, memorize } from "https://deno.land/x/kitchensink_ts@v0.7.3/lambda.ts"
export { sum } from "https://deno.land/x/kitchensink_ts@v0.7.3/numericmethods.ts"

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

export const humanReadableBytesize = (bytesize: number): string => {
	let i = 0
	while (bytesize > 1024 ** i) { i++ }
	i = i <= 0 ? 0 : i - 1
	const
		unit = units[i],
		bytesize_in_unit = (bytesize / (1024 ** i)).toFixed(2)
	return bytesize_in_unit + " " + unit
}

/** removes leading (starting position) slashes "/" and dot slashes "./" .
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

// - [] TODO: add option for setting recursion folder amount
// - [] TODO: add option for branch selection for rest api (you'll have to use the "tree" rest api instead of "repository")
// - [] TODO: add option feature for checking total repo size, including the ui associated with it
// - [] TODO: add option toggling which ui elements/buttons get injected onto the page
// - [] TODO: implement downloading files feature. you will also need to add a separate control for the amount of permitted recursions
// - [] TODO: develop a ".tar" file encoder and decoder
// - [] TODO: add ui associated with the download feature
// - [] TODO: fix the cropping of the `option.html` page when rendered as a popup page
// - [] TODO: replace `eldercat.svg` with a katana wielding seppukucat with a samurail man bun
