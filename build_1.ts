/** this build process simply copies all files under "./src/" to "./dist/${extension_name}/",
 * while excluding all typescript ".ts" files.
*/

import { ensureDir, ensureFile, getDenoJson, pathJoin, relativePath, walkDir } from "./build_tools.ts"

const
	shell_args = new Set(Deno.args),
	log_only = shell_args.delete("--log-only"),
	shell_rest_args = [...shell_args],
	deno_json = await getDenoJson()

// define the source and destination directories
const
	src_dir = "./src/",
	dst_dir = `./dist/${deno_json.name ?? ""}-v${deno_json.version ?? "0.0.0"}/`,
	// additionl files to copy over to the `dst_dir`
	additional_files: Array<[source_path: string, destination_relative_path: string]> = [
		["./license.md", "./license.md"],
	]

const buildManifestJson = (base_manifest_obj: { [key: string]: any }) => {
	const
		{ version, repository, description } = deno_json,
		homepage_url = (repository.url as string).replace(/^git\+/, "").replace(/\.git$/, "")
	Object.assign(base_manifest_obj, { version, description, homepage_url })
	delete base_manifest_obj["$schema"]
	return base_manifest_obj
}

if (!log_only) { await ensureDir(dst_dir) }

// iterate over the files in the source directory recursively
for await (const { path } of walkDir(src_dir, { includeDirs: false })) {
	// ignore typescript files
	if (path.endsWith(".ts")) { continue }
	const rel_path = relativePath(src_dir, path)
	const dst_path = pathJoin(dst_dir, rel_path)
	console.log(`copying ${path} to ${dst_path}`)
	if (!log_only) {
		await ensureFile(dst_path)
		if (path.endsWith("manifest.json")) {
			// before copying `manifest.json`, merge some of the fields from `deno.json` into it, and delete some other fields
			const manifest_obj = buildManifestJson(JSON.parse(await Deno.readTextFile(path)))
			await Deno.writeTextFile(dst_path, JSON.stringify(manifest_obj))
		} else {
			await Deno.copyFile(path, dst_path)
		}
	}
}

for (const [path, dst_relpath] of additional_files) {
	const dst_path = pathJoin(dst_dir, dst_relpath)
	console.log(`copying ${path} to ${dst_path}`)
	if (!log_only) {
		await ensureFile(dst_path)
		await Deno.copyFile(path, dst_path)
	}
}
