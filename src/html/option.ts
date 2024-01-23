import { clamp, storage } from "../lib/deps.ts"

const runMain = async () => {
	const
		save_token_dom = document.querySelector("#save_token") as HTMLButtonElement,
		input_token_dom = document.querySelector("#token") as HTMLInputElement,
		radio_rest_method_dom = document.querySelector("#use_rest_api") as HTMLInputElement,
		radio_graphql_method_dom = document.querySelector("#use_graphql_api") as HTMLInputElement,
		save_recursion_limit_dom = document.querySelector("#save_recursion_limit") as HTMLButtonElement,
		input_recursion_limit_dom = document.querySelector("#recursion_limit") as HTMLInputElement,
		api_method = await storage.get("apiMethod")

	// restore saved values and fill into html
	input_token_dom.value = (await storage.get("githubToken")) ?? ""
	radio_rest_method_dom.checked = api_method === "rest"
	radio_graphql_method_dom.checked = api_method === "graphql"
	input_recursion_limit_dom.value = ((await storage.get("recursionLimit")) ?? 1).toString()

	// save values from html
	save_token_dom.onclick = async () => {
		await storage.set("githubToken", input_token_dom.value)
	}
	radio_rest_method_dom.onclick = async (evt) => {
		if ((evt.target as HTMLInputElement)?.checked) {
			await storage.set("apiMethod", "rest")
		}
	}
	radio_graphql_method_dom.onclick = async (evt) => {
		if ((evt.target as HTMLInputElement)?.checked) {
			await storage.set("apiMethod", "graphql")
		}
	}
	save_recursion_limit_dom.onclick = async () => {
		const value = clamp<number>(Number(input_recursion_limit_dom.value) | 0, 1, 16)
		await storage.set("recursionLimit", value)
	}
}

document.addEventListener("DOMContentLoaded", runMain)
