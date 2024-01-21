/** clean the project directory */
import { walkDir } from "./build_tools.ts"

const
	shell_args = new Set(Deno.args),
	log_only = shell_args.delete("--log-only"),
	dirs_only = shell_args.delete("--dirs-only"),
	files_only = shell_args.delete("--files-only"),
	all_js_files = shell_args.delete("--js-only"),
	shell_rest_args = [...shell_args]

const delete_file_list: string[] = [
	"./deno.d.ts",
	// "./deno.lock",
	"./package.json",
	"./tsconfig.json",
	"./typedoc.json",
]

const delete_dir_list: string[] = [
	// "./backup",
	"./docs/",
	"./dist/",
	"./npm/",
	"./node_modules/",
	"./temp/",
]

const delete_js_in_dir_list: string[] = [
	"./dist/"
]

let stat: Deno.FileInfo

if (dirs_only || !(files_only || all_js_files)) {
	for (const dir_path of delete_dir_list) {
		try { stat = await Deno.stat(dir_path) }
		catch (error) { continue }
		if (stat.isDirectory) {
			console.log("deleting directory:", dir_path)
			if (!log_only) {
				await Deno.remove(dir_path, { recursive: true })
			}
		}
	}
}

if (files_only || !(dirs_only || all_js_files)) {
	for (const file_path of delete_file_list) {
		try { stat = await Deno.stat(file_path) }
		catch (error) { continue }
		if (stat.isFile) {
			console.log("deleting file:", file_path)
			if (!log_only) {
				await Deno.remove(file_path, { recursive: true })
			}
		}
	}
}

if (all_js_files || !(dirs_only || files_only)) {
	const js_files = (await Promise.all(delete_js_in_dir_list.map(async (js_dir) => {
		const js_files_in_dir: string[] = []
		for await (const { path } of walkDir(js_dir, { includeDirs: false })) {
			if (path.endsWith(".js")) {
				js_files_in_dir.push(path)
			}
		}
		return js_files_in_dir
	}))).flat(1)
	for (const js_path of js_files) {
		console.log("deleting javascript:", js_path)
		if (!log_only) {
			await Deno.remove(js_path)
		}
	}
}
