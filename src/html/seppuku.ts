import { config } from "../lib/deps.ts"
import { getSlogan } from "../lib/easter_egg.ts"

const
	text_dom = document.querySelector("#seppuku-div > span") as HTMLSpanElement,
	image_dom = document.querySelector("#seppuku-div > img") as HTMLImageElement

text_dom.textContent = getSlogan.next().value!
image_dom.src = new URL("./seppuku.gif", config.dir.images).toString()
image_dom.onclick = () => { text_dom.textContent = getSlogan.next().value! }
