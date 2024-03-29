import { StorageSchema, array_isEmpty, clamp, dom_setTimeout, layoutCellConfig, storage } from "../lib/deps.ts"

type SaveElementToStorageFunction<E extends HTMLElement> = (element: E) => Promise<void>
type LoadStorageToElementFunction<E extends HTMLElement> = (element: E) => Promise<void>
type SaveAndLoadStorage<SCHEMA> = {
	[key in keyof SCHEMA]: {
		load: LoadStorageToElementFunction<any>
		save: SaveElementToStorageFunction<any>
	}
}

const verify_correctness_of_github_auth_token = (github_auth_token: string, elem?: HTMLInputElement & { id: "#token" }): boolean => {
	const github_auth_token_len = github_auth_token.length
	const create_notification = (text: string, color: string, time_out = 2000) => {
		const notification_text_dom = document.createElement("span")
		notification_text_dom.setAttribute("style", `display: block; background-color: ${color};`)
		notification_text_dom.innerText = text
		dom_setTimeout(() => { notification_text_dom.remove() }, time_out)
		elem!.insertAdjacentElement("afterend", notification_text_dom)
	}
	if (github_auth_token_len <= 0) {
		console.log("github access token has been delete")
		if (elem) { create_notification("github access token deleted", "cornflowerblue") }
	} else if (github_auth_token_len !== 40) {
		console.log("github access token must be exactly", 40, "characters in length", "\n\tthe provided one has a length of:", github_auth_token_len)
		if (elem) { create_notification("token must be 40 characters long", "coral") }
		return false
	}
	return true
}

const save_and_load_storage: SaveAndLoadStorage<Required<StorageSchema>> = {
	githubToken: {
		load: async (elem: HTMLInputElement & { id: "#token" }) => { elem.value = (await storage.get("githubToken")) ?? "" },
		save: async (elem: HTMLInputElement & { id: "#token" }) => {
			const github_auth_token = elem.value.trim()
			if (verify_correctness_of_github_auth_token(github_auth_token, elem)) {
				await storage.set("githubToken", array_isEmpty(github_auth_token) ? undefined : github_auth_token)
			}
		},
	},
	recursionLimit: {
		load: async (elem: HTMLInputElement & { id: "#recursion_limit" }) => { elem.value = (await storage.get("recursionLimit")).toString() },
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
		load: async (elem: HTMLDivElement & { id: "#layout_setup" }) => {
			// first we delete any previous cells, before filling in new ones
			elem.replaceChildren()
			const create_cell = () => {
				const span_dom = document.createElement("span")
				span_dom.classList.add("layout-cell")
				span_dom.innerHTML = `
<select name="feature-select">
	<option value="none">no feature</option>
	<option value="diskspace">diskspace</option>
	<option value="size">size</option>
	<option value="download">download</option>
</select>
<select name="span-select">
	<option value="0">zero span</option>
	<option value="1">1</option>
	<option value="2">2</option>
	<option value="3">3</option>
</select>`.trim()
				return span_dom
			}
			const layout = await storage.get("layout")
			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 3; col++) {
					const
						new_cell = create_cell(),
						{ feature = "none", span = 0 } = layout?.[row]?.[col] ?? {},
						select_feature_dom = new_cell.children[0] as HTMLSelectElement,
						select_span_dom = new_cell.children[1] as HTMLSelectElement,
						option_feature_dom = select_feature_dom.querySelector(`option[value = "${feature}"]`) as (HTMLOptionElement | null),
						option_span_dom = select_span_dom.querySelector(`option[value = "${span}"]`) as (HTMLOptionElement | null)
					select_feature_dom.value = feature
					select_span_dom.value = span.toString()
					if (option_feature_dom) { option_feature_dom.selected = true }
					if (option_span_dom) { option_span_dom.selected = true }
					elem.appendChild(new_cell)
				}
			}
		},
		save: async (elem: HTMLDivElement & { id: "#layout_setup" }) => {
			const layout: StorageSchema["layout"] = []
			let layout_row = 0
			for (let row = 0; row < 3; row++) {
				let
					layout_col = 0,
					are_there_any_features_in_this_row = false
				for (let col = 0; col < 3; col++) {
					const
						cell = elem.children[row * 3 + col],
						select_feature_dom = cell.children[0] as HTMLSelectElement,
						select_span_dom = cell.children[1] as HTMLSelectElement,
						feature = select_feature_dom.value as layoutCellConfig["feature"] | "none",
						span = (Number(select_span_dom.value) | 0) as layoutCellConfig["span"] | 0
					if (feature === "none" || span === 0) { continue }
					layout[layout_row] ??= [] as any
					layout[layout_row]![layout_col] = { feature, span }
					layout_col++
					are_there_any_features_in_this_row = true
				}
				if (are_there_any_features_in_this_row) {
					layout_row++
				}
			}
			await storage.set("layout", layout)
		}
	}
}

const runMain = async () => {
	const
		storage_reset_dom = document.querySelector("#storage_reset") as HTMLButtonElement,
		storage_load_dom = document.querySelector("#storage_load") as HTMLButtonElement,
		storage_save_dom = document.querySelector("#storage_save") as HTMLButtonElement,
		input_token_dom = document.querySelector("#token") as HTMLInputElement,
		input_recursion_limit_dom = document.querySelector("#recursion_limit") as HTMLDivElement,
		api_mode_dom = document.querySelector("#api_mode") as HTMLInputElement,
		layout_setup_dom = document.querySelector("#layout_setup") as HTMLDivElement,
		on_reset = async () => {
			await storage.clear()
			await on_load()
		},
		on_load = async () => {
			await Promise.all([
				save_and_load_storage.githubToken.load(input_token_dom),
				save_and_load_storage.recursionLimit.load(input_recursion_limit_dom),
				save_and_load_storage.apiMethod.load(api_mode_dom),
				save_and_load_storage.layout.load(layout_setup_dom),
			])
		},
		on_save = async () => {
			await Promise.all([
				save_and_load_storage.githubToken.save(input_token_dom),
				save_and_load_storage.recursionLimit.save(input_recursion_limit_dom),
				save_and_load_storage.apiMethod.save(api_mode_dom),
				save_and_load_storage.layout.save(layout_setup_dom),
			])
			await on_load()
		}
	storage_reset_dom.onclick = on_reset
	storage_load_dom.onclick = on_load
	storage_save_dom.onclick = on_save
	on_load()
}

document.addEventListener("DOMContentLoaded", runMain)
