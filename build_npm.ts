import { emptyDir } from "https://deno.land/std@0.204.0/fs/mod.ts"
import { basename as pathBasename, join as pathJoin } from "https://deno.land/std@0.204.0/path/mod.ts"
import { build } from "https://deno.land/x/dnt@0.38.1/mod.ts"
import { createPackageJson, createTSConfigJson, getDenoJson, mainEntrypoint, subEntrypoints } from "./build_tools.ts"


const npm_dir = "./npm/"
const deno_json_dir = "./"
const deno_json = await getDenoJson(deno_json_dir)
const library_name = deno_json.name ?? "library"
const package_json = await createPackageJson(deno_json_dir, {
	scripts: {
		"build-dist": `npm run build-esm && npm run build-esm-minify && npm run build-iife && npm run build-iife-minify`,
		"build-esm": `npx esbuild "${mainEntrypoint}" --bundle --format=esm --outfile="./dist/${library_name}.esm.js"`,
		"build-esm-minify": `npx esbuild "${mainEntrypoint}" --bundle --minify --format=esm --outfile="./dist/${library_name}.esm.min.js"`,
		"build-iife": `npx esbuild "${mainEntrypoint}" --bundle --format=iife --outfile="./dist/${library_name}.iife.js"`,
		"build-iife-minify": `npx esbuild "${mainEntrypoint}" --bundle --minify --format=iife --outfile="./dist/${library_name}.iife.min.js"`,

	}
})
const tsconfig_json = await createTSConfigJson(deno_json_dir)

await emptyDir(npm_dir)
await build({
	entryPoints: [
		mainEntrypoint,
		...subEntrypoints.map(path => ({ name: "./" + pathBasename(path, ".ts"), path: path })),
	],
	outDir: npm_dir,
	shims: { deno: true },
	packageManager: deno_json.node_packageManager,
	package: {
		...package_json
	},
	compilerOptions: {...tsconfig_json.compilerOptions, target: "Latest"},
	typeCheck: false,
	declaration: "inline",
	esModule: true,
	scriptModule: false,
	test: false,
})

// copy other files
Deno.copyFileSync("./src/readme.md", pathJoin(npm_dir, "./src/readme.md"))
Deno.copyFileSync("./src/readme.md", pathJoin(npm_dir, "readme.md"))
Deno.copyFileSync("./src/license.md", pathJoin(npm_dir, "license.md"))
Deno.copyFileSync("./.github/code_of_conduct.md", pathJoin(npm_dir, "code_of_conduct.md"))
Deno.writeTextFileSync(pathJoin(npm_dir, ".gitignore"), "/node_modules/\n")
Deno.writeTextFileSync(pathJoin(npm_dir, "tsconfig.json"), JSON.stringify(tsconfig_json))
Deno.writeTextFileSync(pathJoin(npm_dir, ".npmignore"), `
code_of_conduct.md
dist/
docs/
docs_config/
test/
tsconfig.json
typedoc.json
`, { append: true })
