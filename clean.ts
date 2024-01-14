/** clean the project directory */

const delete_dir_list: string[] = [
	// "./backup",
	"./docs/",
	"./dist/",
	"./npm/",
	"./node_modules/",
	"./temp/",
]

const delete_file_list: string[] = [
	"./deno.d.ts",
	// "./deno.lock",
	"./package.json",
	"./tsconfig.json",
	"./typedoc.json",
]

let stat: Deno.FileInfo
for (const dir_path of delete_dir_list) {
	try { stat = Deno.statSync(dir_path) }
	catch (error) { continue }
	if (stat.isDirectory) Deno.removeSync(dir_path, { recursive: true })
}
for (const file_path of delete_file_list) {
	try { stat = Deno.statSync(file_path) }
	catch (error) { continue }
	if (stat.isFile) Deno.removeSync(file_path, { recursive: true })
}
