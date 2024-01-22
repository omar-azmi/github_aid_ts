import { storage } from "../lib/deps.ts"

const runMain = async () => {
	const
		save_token_dom = document.querySelector("#save_token") as HTMLButtonElement,
		input_token_dom = document.querySelector("#token") as HTMLInputElement,
		radio_rest_method_dom = document.querySelector("#use_rest_api") as HTMLInputElement,
		radio_graphql_method_dom = document.querySelector("#use_graphql_api") as HTMLInputElement,
		api_method = await storage.get("apiMethod")

	input_token_dom.value = (await storage.get("githubToken")) ?? ""
	radio_rest_method_dom.checked = api_method === "rest"
	radio_graphql_method_dom.checked = api_method === "graphql"

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
}

document.addEventListener("DOMContentLoaded", runMain)
