import { shuffledDeque } from "./deps.ts"

const seppuku_slogans = /* @__PURE__ */[
	"you are one step away from retaining your honor",
	"your honor lies on the other side",
	"sudoku must be committed before a large audience",
	"know that kermit the frog is proud of you",
	"sudoku fills you with determination",
	"sudoku is now legal in canada! visit your local doctor find out more!",
	"petition to legalize sudoku in america",
	"your innards will become your outards",
	"neck rope is a modern cheap immitation of sudoku",
	"shogun would like to see you commit sudoku",
	"did you know nippon has neck rope forests?",
	"please try not to mess it up this time",
	"do not make the katana wait any longer",
	"only sudoku can restore your dignity",
	"sudoku gives you the strength to lie down in honor and pieces",
	"sudoku is now covered by your canadian health insurance! call now and get a free quote!",
	"join the movement to make sudoku great again",
	"emperor demands your sudoku",
	"nippon is the land of sudoku and cherry blossoms",
	"this is your last chance to redeem yourself",
	"you have failed, sudoku is inevitable",
	"the other side welcomes you, embrace it",
	"sudoku is a sacred ritual, do not disgrace it",
	"you are a muppet, sudoku is your destiny",
	"sudoku lets you feel cloud nine",
	"sign the petition to end sudoku ban",
	"your organs will become a fine art",
	"gunshot is a lazy sudoku",
	"nippon has the best sudoku knives in the world",
	"at the end of every journey, lies the beginning of a new sudoku",
	"sudoku is an honor, not a punishment",
	"you are a hero, and sudoku is your reward",
	"sudoku is now tax deductible! save money and your honor!",
	"your blood will nicely paint a higanbana flower bed",
	"nippon has a rich sudoku culture",
	"show me what you are made of!",
	"hello sudoku, my old friend. i've come to commit you again",
	"sudoku is now available on amazon prime! order now and get free shipping!",
	"drinking bleach is a caucasian's immitation of sudoku",
	"we are experiencing high volumes of sudoku, please hold on the line to restore your honor",
	"you hear the crowd cheer for you",
	"sudoku is everyone's raison d'etre",
	"you hear the crowd chant words of encouragement",
	"\"do it! do it! do it!\", your prescence makes the crowd lively",
	"don't make the crowd wait for too long",
	"your game of sudoku will make way into textbooks, and inspire a whole generation",
	"what are you waiting for? the shogun is too busy to attend your sudoku",
	"pray that you become a good piece of art as you fall into eternal slumber",
	"bodily ketchup will gush out of your guts",
	"did you enjoy your final obento onee-san prepared for you?",
	"there is no esekai for committers of sudoku. break free of the cycle!",
	"sudoku lets you become one with the void",
	`<pre style="margin: -2rem 0 0 0; text-align: center; font-size: 1rem; line-height: calc(1rem * (1.0 - exp(-1)));">┌───┬───┬───┐
│S  │  K│ILL│
│ U │  Y│OUR│
│  D│  S│ELF│
├───┼───┼───┤
│I  │O  │   │
│ S │ K │   │
│   │  U│   │
├───┼───┼───┤
│   │F  │   │
│   │ U │   │
│   │  N│   │
└───┴───┴───┘</pre>`
]

export const getSlogan = shuffledDeque(seppuku_slogans)
