import { shuffledDeque, config } from "./deps.ts"

const seppuku_image_path = new URL("./seppuku.gif", config.dir.images)
const seppuku_slogans = /* @__PURE__ */[
	"you are one step away from retaining your honor",
	"your honor lies on the other side",
	"sudoku must be commited before a large audience",
	"know that kermit the frog is proud of you",
	"sudoku fills you with determination",
	"sudoku is now legal in canada! visit your local doctor find out more!",
	"petition to legalize sudoku in america",
	"your innards will become your outards",
	"neck rope is a modern cheap immitation of sudoku",
	"shogun would like to see you commit sudoku",
	"did you know nippon had sudoku forests?",
]

export const getSlogan = shuffledDeque(seppuku_slogans)
