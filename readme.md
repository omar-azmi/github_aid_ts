# Github Aid

This is a Chromium and Firefox extension for viewing github Repository sizes, and ~~Bulk downloading~~ selected files and subdirectories.

> TODO: The download feature has yet to be implemented


### Why?

- because two of the popular extensions which did previously work, suddenly stopped working since december 2023.
  - [github-repo-size](https://github.com/harshjv/github-repo-size)
  - [enhanced-github](https://github.com/softvar/enhanced-github)

- the codebase of both uses NodeJs, which comes along with a lot of boilerplate

- both used `manifest v2`, which will be deprecated in chromium sometime later this year

- neither looks good and usable at the same time in mobile display

-  wanted to do a fun weekend project, try out some GraphQL apis, and be done with the annoyance of constant non-functioning extensions


### How the internals differ

This project provides a good minimal-boilerplate example of how one can generate a web-extension, while:
- only using typescript, and no NodeJs boilerplate or 3rd-party typescript dependencies
- uncoupling all of the following three major parts of the code:
  - library code (responsible for fetching and parsing data from `api.github.com`), coded under [`/src/lib/`]("./src/lib/")
  - user interface code (responsible for configuring and customizing user options), coded under [`/src/html/`]("./src/html/")
  - background script (responsible for injecting this extension's UI into `github.com`), coded under [`/src/js/`]("./src/js/")
- being able to transpile, bundle, minify, and package all in one go. all thanks to the incredible [esbuild tool](https://github.com/evanw/esbuild), and its Deno compatibility plugin [esbuild_deno_loader](https://github.com/lucacasonato/esbuild_deno_loader)

If you look at a typical extension development codebase, you'll encounter:
- a lot of node-specific files
- ton of external developmental dependencies
- lots of config files for the dependencies
- lots of tasks defined by the dependencies that need to be run sequentially for the build process to work
- having to strictly adhere to a certain directory structure set by the dependencies (or their config files)
- a nighmare when trying to reference a simple typescript relative import
  - for instance, you'll need to use the `".js"` extension suffix in some occasions. other times the extension part has to be dropped
  - same directory relative import cannot be done, and has to be done relative to the project's root (where `package.json` lies)
  - having to adjust to framework specific import prefix characters

all in all, that will lead to a highly coupled codebase, and it'll be incredibly difficult to extract just one part of it for testing, or reusability somewhere else.


### The Deno build process

```mermaid
---
title: "Build process"
---
flowchart LR
	StartNode(["deno task build-all"])
	StartNode -->|"1"| 877701(["deno task build-1"])
	StartNode -->|"2"| 247711(["deno task build-2"])
	247711 --> 557486
	877701 --> 977090

	subgraph 557486["./build_2.ts"]
		418522["
			collect each '.ts' file under
			the script endpoints:
			- '/src/html/*.ts'
			- '/src/js/*.ts'
		"] --> 287901

		287901 --> 176317["
			write the resulting js-code files from
			memory to the '/dist/' directory, mirroring
			their original (entry-point) location.
			unfortunately, the non-endpoint
			split-code js files end up directly
			under '/dist/', which may look ugly
			from a distribution perspective
		"]

		subgraph 287901["./build_tools.ts --&gt; doubleCompileFiles()"]
		direction LR
			728262["
				run esbuild bundling with:
				- deno plugin, for resolving import paths
				- minification + tree-shaking, to
				remove unimported exported objects
				- code-splitting, to preserve common
				imports across different endpoints
				- writing disabled, so that the bundled
				file results are stored in-memory
			"] --> 558940["
				now that the standalone bundled code files
				are free of external dependencies,
				on each individual output js code file:
				- run esbuild transform with minification,
				to remove dead-code within the same file
			"]
		end
	end
	
	557486 --> EndNode(["end"])

	subgraph 977090["./build_1.ts"]
		708084["
			copy all non-typescript
			files from '/src/' to '/dist/'
		"]
	end
```


### General import map
```mermaid
---
title: "Import graph"
---
flowchart TD
	591514(("deps.ts")) --> 530727((("option.ts\n(endpoint)")))
	423910(("typedefs.ts")) -->|"dynamic\nimport"| 709575((("content_script.ts\n(endpoint)")))
	405595(("modify_ui.ts")) -->|"dynamic\nimport"| 709575
	591514 -->|"dynamic\nimport"| 709575
	subgraph 325333["/src/lib/"]
		591514 --> 650261(("gh_rest_api.ts"))
		423910 --> 650261
		591514 --> 517060(("gh_graphql_api.ts"))
		423910 --> 517060
		650261 --> 405595
		517060 --> 405595
		591514 --> 405595
		423910 --> 405595
	end
	subgraph 201358["/src/js/"]
		709575
	end
	subgraph 843058["/src/html/"]
		530727 -->|"imported as\n'./option.js'"| 635635[["option.html"]]
	end
```

### How to get a Github Access Token

- First of all, you'll need to be logged into your github account (Duh!).
- Navigate to here: [Generate new token (classic)](https://github.com/settings/tokens/new) (https://github.com/settings/tokens/new)
- Set an `Expiration` date, (you'll probably want to choose `No expiration`)
- In the `Select scopes` section, under the `repo` checkbox:
  - enable only the `public_repo` checkbox if you will NOT be viewing your private repository's stats
  - enable the whole `repo` group checkbox otherwise
- Scroll to the bottom and click on the `Generate token` button
- You will now be presented with the access token. MAKE SURE TO COPY AND SAVE IT NOW! This token will forever disapear after you close the dialog, so make sure to save it
- Paste the token into this browser extension

For a visual guide, see one of:
- https://www.geeksforgeeks.org/how-to-generate-personal-access-token-in-github/
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

But remember NOT to check any scope boxes besides the `repo` one.
Doing cheking anythin else is dangerous if your key gets leaked,
and someone decides to maliciously delete your projects, or hold them for ransom.
(as if that has ever happened)
