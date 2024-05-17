/// <reference types="npm:web-ext-types" />

export { shuffleArray, shuffledDeque } from "jsr:@oazmi/kitchensink@0.7.5/array2d"
export { array_isArray, array_isEmpty, dom_setTimeout, number_isFinite, object_entries } from "jsr:@oazmi/kitchensink@0.7.5/builtin_aliases_deps"
export { debounceAndShare, memorize } from "jsr:@oazmi/kitchensink@0.7.5/lambda"
export { clamp, sum } from "jsr:@oazmi/kitchensink@0.7.5/numericmethods"
import { dom_setTimeout, object_entries, object_fromEntries } from "jsr:@oazmi/kitchensink@0.7.5/builtin_aliases_deps"


declare const chrome: typeof browser
export const getBrowser = () => {
	const possible_browser = typeof browser !== "undefined" ?
		browser :
		typeof chrome !== "undefined" ?
			chrome :
			undefined
	return possible_browser?.runtime ? possible_browser : undefined
}
export const getLocalStorage = () => {
	return globalThis?.localStorage ?? undefined
}

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

export const modifyElementStyleTemporarily = (elem: HTMLElement, duration_ms: number, prepend_style = "", append_style = ""): number => {
	const
		original_style = elem.getAttribute("style") ?? "",
		modified_style = prepend_style + original_style + append_style
	elem.setAttribute("style", modified_style)
	return dom_setTimeout(() => {
		elem.setAttribute("style", original_style)
	}, duration_ms)
}

const
	null_entries_to_undefined = <T>(obj: T): { [K in keyof T]: T[K] extends null ? undefined : T[K] } => {
		for (const key in obj) {
			if (obj[key] === null) {
				obj[key] = undefined as any
			}
		}
		return obj as any
	},
	undefined_entries_to_null = <T>(obj: T): { [K in keyof T]: T[K] extends undefined ? null : T[K] } => {
		for (const key in obj) {
			if (obj[key] === undefined) {
				obj[key] = null as any
			}
		}
		return obj as any
	}


abstract class SomeStorage<SCHEMA extends Record<string, any>> {
	/** specify if the storage is available */
	available: boolean = false

	constructor(default_values?: SCHEMA) { }

	/** specify the default values of each entry of the storage */
	abstract readonly default: SCHEMA

	/** get a key's value. if the key hasn't been set yet, you'll receive the default value */
	abstract get<K extends keyof SCHEMA>(key: K): Promise<SCHEMA[K]>

	/** set a key's value. as a consequence, {@link has} will now return `true` */
	abstract set<K extends keyof SCHEMA>(key: K, value: SCHEMA[K]): Promise<void>

	/** delete a key (and go back to default value). as a consequence, {@link has} will now return a `false` after the deletion */
	abstract del<K extends keyof SCHEMA>(key: K): Promise<void>

	/** has the `key` ever been written to? or is it still untampered? */
	abstract has<K extends keyof SCHEMA>(key: K): Promise<boolean>

	abstract getBulk<K extends keyof SCHEMA>(keys: Array<K>): Promise<{ [J in K]: SCHEMA[J] }>
	abstract setBulk<K extends keyof SCHEMA>(subset: Pick<SCHEMA, K>): Promise<void>
	abstract delBulk<K extends keyof SCHEMA>(keys: Array<K>): Promise<void>

	/** clear the entire storage (and go back to default values as a consequence) */
	abstract clear(): Promise<void>

	/** provide a list of storage classes to pick from, in the order of decreasing priority,
	 * and this method will pick the first available one, and return an instance of it.
	*/
	static pickAvailableStorage<SCHEMA extends Record<string, any>>(default_values: SCHEMA, ...storage_classes: (typeof SomeStorage<SCHEMA>)[]) {
		for (const storage_class of storage_classes) {
			// @ts-ignore
			const new_storage: SomeStorage<SCHEMA> = new storage_class(default_values)
			if (new_storage.available) {
				return new_storage
			}
		}
	}
}

// the `({} | undefined)` portion in the type allows all objects and primitives, excluding the `null` type
class BrowserStorage<SCHEMA extends Record<string, ({} | undefined)>> extends SomeStorage<SCHEMA> {
	private storage: (typeof browser)["storage"]["sync"]
	default: SCHEMA

	constructor(default_values: SCHEMA) {
		super()
		this.available = (this.storage = getBrowser()?.storage?.sync as any) ? true : false
		/** important: all `undefined` default values act destructively. meaning that they delete the storage entry.
		 * so, when you set a certain key's default value as `undefined`, the resulting returned value by
		 * `this.storage.get` will be deleted immediately, even it it exists in the storage.
		 * check this example to understand what's going on:
		 * ```ts
		 * const storage = chrome.storage.sync
		 * storage.set({hello: "world"})
		 * console.assert((await storage.get({hello: "blahblah"})).hello === "world")
		 * console.assert((await storage.get({hello: undefined})).hello === undefined)
		 * console.assert((await storage.get({hello: null})).hello === "world")
		 * ```
		 * hence is the reason why we're first converting all `undefined` default values to `null`.
		 * we'll also need to  convert all of the fetched `null` values back to `undefined` in the `get` method.
		*/
		const default_values_clone = { ...default_values }
		this.default = undefined_entries_to_null(default_values_clone) as any
	}

	async get<K extends keyof SCHEMA>(key: K): Promise<SCHEMA[K]> {
		const value = ((await this.storage.get({
			[key]: this.default[key] as any
		})) as SCHEMA)[key] as (SCHEMA[K] | null)
		// see the note inside of the constructor to understand the importance of `null`, and the reason why we convert `null` to `undefined`
		return (value ?? undefined) as any
	}

	async set<K extends keyof SCHEMA>(key: K, value: SCHEMA[K]): Promise<void> {
		await this.setBulk({ [key]: value } as any)
	}

	async del<K extends keyof SCHEMA>(key: K): Promise<void> {
		await this.delBulk([key])
	}

	async has<K extends keyof SCHEMA>(key: K): Promise<boolean> {
		// here, we simply check if `this.storage.get(key)[key] === undefined`,
		// because, if that key had ever been set to `undefined` via our `set` method, then it would've internally converted it to `null`,
		// and we would've actually gotten `this.storage.get(key)[key] === null` instead.
		// but actually, it seems far more reasonable to simply check of the `key` exists in the returned storage value object via `key in (await this.storage.get(key as any))`
		// but i don't want to do that right now, unless i encounter an issue with my current way.
		return (await this.storage.get(key as any))[key] === undefined
	}

	async getBulk<K extends keyof SCHEMA>(keys: K[]): Promise<{ [J in K]: SCHEMA[J] }> {
		const
			default_values = this.default,
			picked_default_values = object_fromEntries(keys.map((k) => ([k, default_values[k]])))
		return null_entries_to_undefined(await this.storage.get(picked_default_values)) as any
	}

	async setBulk<K extends keyof SCHEMA>(subset: Pick<SCHEMA, K>): Promise<void> {
		// see the note inside of the constructor to understand the importance of `null`, and the reason why we convert `undefined` to `null` in here
		await this.storage.set(undefined_entries_to_null(subset) as any)
	}

	async delBulk<K extends keyof SCHEMA>(keys: K[]): Promise<void> {
		await this.storage.remove(keys as any)
	}

	async clear(): Promise<void> {
		await this.storage.clear()
	}
}

class LocalStorage<SCHEMA extends Record<string, string>> extends SomeStorage<SCHEMA> {
	private storage: WindowLocalStorage["localStorage"]
	default: SCHEMA

	constructor(default_values: SCHEMA) {
		super()
		this.available = (this.storage = getLocalStorage()) ? true : false
		this.default = default_values
	}

	async get<K extends keyof SCHEMA>(key: K): Promise<SCHEMA[K]> { return (this.storage.getItem(key as string) as (SCHEMA[K] | null)) ?? this.default[key] }
	async set<K extends keyof SCHEMA>(key: K, value: SCHEMA[K]): Promise<void> { this.storage.setItem(key as string, value) }
	async del<K extends keyof SCHEMA>(key: K): Promise<void> { this.storage.removeItem(key as string) }
	async has<K extends keyof SCHEMA>(key: K): Promise<boolean> { return this.storage.getItem(key as string) !== null }
	async getBulk<K extends keyof SCHEMA>(keys: K[]): Promise<{ [J in K]: SCHEMA[J] }> {
		const
			storage = this.storage,
			default_values = this.default
		return object_fromEntries(keys.map((k) => (
			[k, storage.getItem(k as string) ?? default_values[k]]
		))) as any
	}
	async setBulk<K extends keyof SCHEMA>(subset: Pick<SCHEMA, K>): Promise<void> {
		const storage = this.storage
		for (const [key, value] of object_entries(subset as Record<string, string>)) {
			storage.setItem(key, value)
		}
	}
	async delBulk<K extends keyof SCHEMA>(keys: K[]): Promise<void> {
		const storage = this.storage
		keys.forEach((key) => storage.removeItem(key as string))
	}
	async clear(): Promise<void> { this.storage.clear() }
}

class MapStorage<SCHEMA extends Record<string, any>> extends SomeStorage<SCHEMA> {
	private storage: Map<keyof SCHEMA, SCHEMA[keyof SCHEMA]>
	default: SCHEMA

	constructor(default_values: SCHEMA) {
		super()
		this.available = (this.storage = new Map()) ? true : false
		this.default = default_values
	}

	async get<K extends keyof SCHEMA>(key: K): Promise<SCHEMA[K]> { return this.storage.get(key) ?? this.default[key] }
	async set<K extends keyof SCHEMA>(key: K, value: SCHEMA[K]): Promise<void> { this.storage.set(key, value) }
	async del<K extends keyof SCHEMA>(key: K): Promise<void> { this.storage.delete(key) }
	async has<K extends keyof SCHEMA>(key: K): Promise<boolean> { return this.storage.has(key) }
	async getBulk<K extends keyof SCHEMA>(keys: K[]): Promise<{ [J in K]: SCHEMA[J] }> {
		const
			storage = this.storage,
			default_values = this.default
		return object_fromEntries(keys.map((k) => (
			[k, storage.get(k) ?? default_values[k]]
		))) as any
	}
	async setBulk<K extends keyof SCHEMA>(subset: Pick<SCHEMA, K>): Promise<void> {
		const storage = this.storage
		for (const [key, value] of object_entries(subset)) {
			storage.set(key, value as SCHEMA[K])
		}
	}
	async delBulk<K extends keyof SCHEMA>(keys: K[]): Promise<void> {
		const storage = this.storage
		keys.forEach((key) => storage.delete(key))
	}
	async clear(): Promise<void> { this.storage.clear() }
}

type Features = "size" | "diskspace" | "download"
export interface layoutCellConfig {
	span: 1 | 2 | 3
	feature: Features
}

export interface StorageSchema {
	githubToken?: string | undefined
	apiMethod: "rest" | "graphql"
	recursionLimit: number
	layout: [
		row0?: [column0: layoutCellConfig, column1?: layoutCellConfig, column2?: layoutCellConfig],
		row1?: [column0: layoutCellConfig, column1?: layoutCellConfig, column2?: layoutCellConfig],
		row2?: [column0: layoutCellConfig, column1?: layoutCellConfig, column2?: layoutCellConfig],
	]
}

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
	},
	features: {
		"size": { buttonText: "sizes" },
		"diskspace": { buttonText: "diskspace" },
		"download": { buttonText: "download" },
	} as Record<Features, { buttonText: string }>,
	storageDefaults: {
		githubToken: undefined,
		apiMethod: "rest",
		recursionLimit: 7,
		layout: [
			[{ feature: "download", span: 1 }, { feature: "diskspace", span: 1 }, { feature: "size", span: 1 }],
		],
	} as StorageSchema
}

export const storage = SomeStorage.pickAvailableStorage<StorageSchema>(config.storageDefaults, BrowserStorage as any, MapStorage as any)!
