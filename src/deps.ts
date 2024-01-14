export { array_isArray } from "https://deno.land/x/kitchensink_ts@v0.7.3/builtin_aliases_deps.ts"
export { memorize } from "https://deno.land/x/kitchensink_ts@v0.7.3/lambda.ts"


const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]

export const humanReadableBytesize = (bytesize: number): string => {
	let i = 0
	while (bytesize > 1024 ** i) { i++ }
	const
		unit = units[i],
		bytesize_in_unit = (bytesize / (1024 ** (i - 1))).toFixed(2)
	return bytesize_in_unit + " " + unit
}
