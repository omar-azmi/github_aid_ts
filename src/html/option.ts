import { StorageSchema, clamp, storage } from "../lib/deps.ts"

type SaveElementToStorageFunction<E extends HTMLElement> = (element: E) => Promise<void>
type LoadStorageToElementFunction<E extends HTMLElement> = (element: E) => Promise<void>
type SaveAndLoadStorage<SCHEMA> = {
	[key in keyof SCHEMA]: {
		load: LoadStorageToElementFunction<any>
		save: SaveElementToStorageFunction<any>
	}
}

const save_and_load_storage: SaveAndLoadStorage<Required<StorageSchema>> = {
	githubToken: {
		load: async (elem: HTMLInputElement & { id: "#token" }) => { elem.value = (await storage.get("githubToken")) ?? "" },
		save: async (elem: HTMLInputElement & { id: "#token" }) => { await storage.set("githubToken", elem.value) },
	},
	recursionLimit: {
		load: async (elem: HTMLInputElement & { id: "#recursion_limit" }) => { elem.value = ((await storage.get("recursionLimit")) ?? 1).toString() },
		save: async (elem: HTMLInputElement & { id: "#recursion_limit" }) => {
			const value = clamp<number>(Number(elem.value) | 0, 1, 16)
			await storage.set("recursionLimit", value)
		},
	},
	apiMethod: {
		load: async (elem: HTMLDivElement & { id: "#api_mode" }) => {
			const
				radio_rest_method_dom = elem.querySelector("#use_rest_api") as HTMLInputElement,
				radio_graphql_method_dom = elem.querySelector("#use_graphql_api") as HTMLInputElement,
				is_graphql_api = (await storage.get("apiMethod")) === "graphql"
			radio_rest_method_dom.checked = !is_graphql_api
			radio_graphql_method_dom.checked = is_graphql_api
		},
		save: async (elem: HTMLDivElement & { id: "#api_mode" }) => {
			const
				radio_rest_method_dom = elem.querySelector("#use_rest_api") as HTMLInputElement,
				radio_graphql_method_dom = elem.querySelector("#use_graphql_api") as HTMLInputElement,
				is_graphql_api = (radio_graphql_method_dom.checked) && (!radio_rest_method_dom.checked)
			await storage.set("apiMethod", is_graphql_api ? "graphql" : "rest")
		},
	},
	layout: {

	}
}

type a = HTMLInputElement extends HTMLElement ? true : false

const runMain = async () => {
	const
		storage_save_dom = document.querySelector("#storage_save") as HTMLButtonElement,
		storage_load_dom = document.querySelector("#storage_load") as HTMLButtonElement,
		storage_reset_dom = document.querySelector("#storage_reset") as HTMLButtonElement,
		input_token_dom = document.querySelector("#token") as HTMLInputElement,
		input_recursion_limit_dom = document.querySelector("#recursion_limit") as HTMLDivElement,
		api_mode_dom = document.querySelector("#api_mode") as HTMLInputElement,
		layout_setup_dom = document.querySelector("#layout_setup") as HTMLDivElement,
		on_load = () => {
			save_and_load_storage.githubToken.load(input_token_dom)
			save_and_load_storage.recursionLimit.load(input_recursion_limit_dom)
			save_and_load_storage.apiMethod.load(api_mode_dom)
		},
		on_save = () => {
			save_and_load_storage.githubToken.save(input_token_dom)
			save_and_load_storage.recursionLimit.save(input_recursion_limit_dom)
			save_and_load_storage.apiMethod.save(api_mode_dom)
		}
	storage_load_dom.onclick = on_load
	storage_save_dom.onclick = on_save
	on_load()
}

document.addEventListener("DOMContentLoaded", runMain)
