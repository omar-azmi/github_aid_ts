import { ensureFile } from "https://deno.land/std@0.204.0/fs/mod.ts"
import { doubleCompileFiles } from "./build_tools.ts"


/** use:
 * - `"./src/mod.ts"` for bundling the main module (default if unspecified in `Deno.args`)
 * - `"./examples/${num}/${script}.ts"` for compiling an example
*/
const
	compile_file = Deno.args[0] ?? "./src/mod.ts",
	out_dir = "./src_extension/js/"

const output_files = await doubleCompileFiles(compile_file, out_dir,
	{platform: "browser"},
	{minify: true},
)

await Promise.all(output_files.map(
	async ({ text, path }, file_number) => {
		await ensureFile(path)
		await Deno.writeTextFile(path, text)
	}
))
