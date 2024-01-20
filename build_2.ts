/** this build process simply transpiles all typescript ".ts" files under the following directories:
 * - "./src/js/"
 * - "./src/html/"
 * to the destination directories:
 * - "./dist/${extension_name}/js/"
 * - "./dist/${extension_name}/html/"
*/

import { doubleCompileFiles, ensureDir, ensureFile, esstop, getDenoJson, pathJoin, relativePath, walkDir } from "./build_tools.ts"

const
	log_only = Deno.args[0] === "--log-only" ? true : false,
	deno_json = await getDenoJson()

// define the typescript source directories, and destination directory
const
	src_dir = "./src/",
	ts_dirs = [
		pathJoin(src_dir, "./js/"),
		pathJoin(src_dir, "./html/"),
	],
	dst_dir = `./dist/${deno_json.name ?? ""}-v${deno_json.version ?? "0.0.0"}/`

if (!log_only) { await ensureDir(dst_dir) }

const ts_files = (await Promise.all(ts_dirs.map(async (ts_dir) => {
	const ts_files_in_dir: string[] = []
	for await (const { path } of walkDir(ts_dir, { includeDirs: false })) {
		if (path.endsWith(".ts")) {
			ts_files_in_dir.push(path)
		}
	}
	return ts_files_in_dir
}))).flat(1)

const output_files = await doubleCompileFiles("", dst_dir,
	{
		entryPoints: ts_files,
		outbase: src_dir,
		bundle: true,
		splitting: true, // `background.js` cannot do esm imports unfortunately
		platform: "browser",
	},
	{ minify: true },
)

console.log("witing the following transpiled files:", output_files.map((out_file) => out_file.path))
if (!log_only) {
	await Promise.all(output_files.map(
		async ({ text, path }, file_number) => {
			await ensureFile(path)
			await Deno.writeTextFile(path, text)
		}
	))
}