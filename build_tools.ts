/** some build specific utility functions */
import { ensureDir } from "https://deno.land/std@0.204.0/fs/mod.ts"
import { join as pathJoin } from "https://deno.land/std@0.204.0/path/mod.ts"
import { BuildOptions, PackageJson } from "https://deno.land/x/dnt@0.38.1/mod.ts"
import {
	BuildOptions as ESBuildOptions,
	OutputFile as ESOutputFile,
	TransformOptions as ESTransformOptions,
	build as esbuild, stop as esstop, transform as estransform
} from "https://deno.land/x/esbuild@v0.17.19/mod.js"
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.1/mod.ts"


export const mainEntrypoint: string = "./src/mod.ts"
export const subEntrypoints: string[] = [
	"./src/array2d.ts",
	"./src/binder.ts",
	"./src/browser.ts",
	"./src/builtin_aliases_deps.ts",
	"./src/builtin_aliases.ts",
	"./src/collections.ts",
	"./src/crypto.ts",
	"./src/devdebug.ts",
	"./src/dotkeypath.ts",
	"./src/eightpack.ts",
	"./src/eightpack_varint.ts",
	"./src/formattable.ts",
	"./src/image.ts",
	"./src/lambda.ts",
	"./src/lambdacalc.ts",
	"./src/mapper.ts",
	"./src/numericarray.ts",
	"./src/numericmethods.ts",
	"./src/stringman.ts",
	"./src/struct.ts",
	"./src/typedbuffer.ts",
	"./src/typedefs.ts",
]

export interface LeftoverArtifacts {
	cleanup: () => Promise<void>
}

export interface TemporaryFiles extends LeftoverArtifacts {
	dir: string
	files: string[]
}

interface NPM_Artifacts extends TemporaryFiles {
	files: ["package.json", "tsconfig.json"]
}

let deno_json: { [key: string]: any }
export const getDenoJson = async (base_dir: string = "./") => {
	deno_json ??= JSON.parse(await Deno.readTextFile(pathJoin(base_dir, "./deno.json")))
	return deno_json
}

export const createPackageJson = async (deno_json_dir: string = "./", overrides: Partial<PackageJson> = {}): Promise<PackageJson> => {
	const { name, version, description, author, license, repository, bugs, devDependencies } = await getDenoJson(deno_json_dir)
	return {
		name: name ?? "",
		version: version ?? "0.0.0",
		description, author, license, repository, bugs, devDependencies,
		...overrides
	}
}

export const createTSConfigJson = async (deno_json_dir: string = "./", overrides: Partial<{ compilerOptions: BuildOptions["compilerOptions"] }> = {}): Promise<{ "$schema": string, compilerOptions: BuildOptions["compilerOptions"] }> => {
	const { compilerOptions } = await getDenoJson(deno_json_dir)
	// remove "deno.ns" from compiler options, as it breaks `dnt` (I think)
	compilerOptions.lib = (compilerOptions.lib as string[]).filter((v) => v.toLowerCase() !== "deno.ns")
	Object.assign(compilerOptions,
		{
			target: "ESNext",
			forceConsistentCasingInFileNames: true,
			skipLibCheck: true,
			moduleResolution: "nodenext",
		},
		overrides.compilerOptions,
	)
	delete overrides.compilerOptions
	return {
		"$schema": "https://json.schemastore.org/tsconfig",
		...overrides,
		compilerOptions,
	}
}

export const createNPMFiles = async (
	deno_json_dir: string = "./",
	npm_base_dir: string = "./",
	package_json_overrides: Partial<PackageJson> = {},
	tsconfig_json_overrides: any = {}
): Promise<NPM_Artifacts> => {
	const
		package_json_path = pathJoin(npm_base_dir, "package.json"),
		tsconfig_json_path = pathJoin(npm_base_dir, "tsconfig.json")

	await ensureDir(npm_base_dir)
	await Promise.all([
		createPackageJson(deno_json_dir, package_json_overrides)
			.then((package_json_output) => Deno.writeTextFile(
				pathJoin(npm_base_dir, "package.json"),
				JSON.stringify(package_json_output)
			)),
		createTSConfigJson(deno_json_dir, tsconfig_json_overrides)
			.then((tsconfig_json_output) => Deno.writeTextFile(
				pathJoin(npm_base_dir, "tsconfig.json"),
				JSON.stringify(tsconfig_json_output)
			)),
	])

	return {
		dir: npm_base_dir,
		files: ["package.json", "tsconfig.json"],
		cleanup: async () => {
			await Promise.all([
				Deno.remove(package_json_path, { recursive: true }),
				Deno.remove(tsconfig_json_path, { recursive: true }),
			])
		}
	}
}

export const doubleCompileFiles = async (
	compile_file_path: string,
	out_dir: string,
	overrid_bundle_options: ESBuildOptions = {},
	overrid_minify_options: ESTransformOptions = {},
) => {
	let t0 = performance.now(), t1: number

	const bundled_code = await esbuild({
		entryPoints: [compile_file_path],
		outdir: out_dir,
		bundle: true,
		minifySyntax: true,
		platform: "neutral",
		format: "esm",
		target: "esnext",
		plugins: [...denoPlugins()],
		...overrid_bundle_options,
		write: false,
	})

	const bundled_files = await Promise.all(bundled_code.outputFiles.map(
		async ({ text, path }, file_number): Promise<ESOutputFile> => {
			const
				js_text = (await estransform(text, {
					minify: true,
					platform: "browser",
					format: "esm",
					target: "esnext",
					...overrid_minify_options
				})).code,
				js_text_uint8 = (new TextEncoder()).encode(js_text)
			console.log("bundled file", file_number, "\n\t" ,"output path:", path, "\n\t", "binary size:", js_text_uint8.byteLength / 1024, "kb")
			return {
				path,
				text: js_text,
				contents: js_text_uint8
			}
		}
	))

	esstop()
	t1 = performance.now()
	console.log("bundling time:", t1 - t0, "ms")
	return bundled_files
}
