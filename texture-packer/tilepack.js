console.log('Packing...')

const SRC_DIR = 'src'
const PNG_OUT_PATH = 'atlas.png'
const TYPESCRIPT_OUT_PATH = ['../client/src', '../server/src'].map(p => p + '/Ids.ts')
const TEX_COORDS_OUT_PATH = '../client/src/Tex.ts'
const TEXTURE_SIZE = 512
const MIN_FRAMES_PER_ROW = 6

const path = require('path')
const fs = require('fs')
const Jimp = require('jimp')

const isFile = path => !fs.statSync(path).isDirectory()
const existsFile = path => fs.existsSync(path) && isFile(path)

if (!existsFile(SRC_DIR + '/meta.json')) {
	console.log(`Could not find "${SRC_DIR}/meta.json" file. Goodbye.`)
	process.exit(0)
}

const meta = JSON.parse(fs.readFileSync(SRC_DIR + '/meta.json'))

const rects = meta.index.map(async (pngPath) => {
	const isAnimation = pngPath.endsWith('-0.png')
	if (isAnimation) {
		const frames = []
		let i = 0
		while (true) {
			const framePath = SRC_DIR + '/' + pngPath.replace(new RegExp(`-0.png$`), `-${i}.png`)
			if (existsFile(framePath)) {
				frames.push(await Jimp.read(framePath))
				i++
			} else {
				break
			}
		}
		return new Rect(pngPath, frames, -1, -1, frames[0].bitmap.width * frames.length * frames[0].bitmap.height, 1)
	} else {
		const img = await Jimp.read(SRC_DIR + '/' + pngPath)
		return new Rect(pngPath, img, -1, -1, img.bitmap.width, img.bitmap.height)
	}
})


class Rect {
	constructor(path, png, x, y, width, height) {
		this.path = path
		this.png = png
		this.x = x
		this.y = y
		this.width = width
		this.height = height
	}

	hit(rect) {
		return this.x < rect.x + rect.width && this.x + this.width > rect.x && this.y < rect.y + rect.height && this.y + this.height > rect.y
	}

	setNumPerRow(n) {
		this.numPerRow = n
		return this
	}
}

let x = 0
let y = 0
const placedRects = []

Promise.all(rects).then(async (rects) => {
	rects = rects.sort((a, b) => a.width * a.height - b.width * b.height) // sort smallest to biggest
	while (rects.length > 0 && y < TEXTURE_SIZE) {
		let placedThisLoop = false
		for (let i = rects.length - 1; i >= 0; i--) { // iterate in reverse-order (biggest to smallest)
			const rect = rects[i]
			rect.x = x
			rect.y = y
			const isAnimation = Array.isArray(rect.png)
			let outOfBounds
			let hit
			if (isAnimation) {
				rect.numPerRow = rect.png.length
				while (rect.numPerRow >= Math.min(MIN_FRAMES_PER_ROW, rect.png.length)) {
					let rows = Math.ceil(rect.png.length / rect.numPerRow)
					rect.width = rect.numPerRow * rect.png[0].bitmap.width
					rect.height = rows * rect.png[0].bitmap.height
					outOfBounds = (rect.x + rect.width > TEXTURE_SIZE || rect.y + rect.height > TEXTURE_SIZE)
					hit = placedRects.some(r => rect.hit(r))
					
					if (hit || outOfBounds) {
						rect.numPerRow--
					} else {
						break
					}
				}
			} else {
				outOfBounds = (rect.x + rect.width > TEXTURE_SIZE || rect.y + rect.height > TEXTURE_SIZE)
				hit = placedRects.some(r => rect.hit(r))
			}
			if (!hit && !outOfBounds) {
				x += rect.width
				placedThisLoop = true
				if (isAnimation) {
					const width = rect.png[0].bitmap.width
					const height = rect.png[0].bitmap.height
					let x = 0
					let y = 0
					for (let i = 0; i < rect.png.length; i++) {
						placedRects.push(
							new Rect(
								(i == 0) ? rect.path : null,
								rect.png[i],
								rect.x + x * width,
								rect.y + y * height,
								rect.png[0].bitmap.width,
								rect.png[0].bitmap.height
							).setNumPerRow(rect.numPerRow)
						)
						x++
						if (x == rect.numPerRow) {
							x = 0
							y++
						}
					}
				} else {
					placedRects.push(rect)
				}
				rects.splice(i, 1) // because we iterate reverse-order, we can safely mutate array
			} // if
		} // for

		if (!placedThisLoop) {
			x++
		}

		if (x >= TEXTURE_SIZE) {
			y++
			x = 0
		}

	} // while

	new Jimp(TEXTURE_SIZE, TEXTURE_SIZE, async (err, image) => {
		if (err) {
			console.log('err', err)
			return
		}

		for (const rect of placedRects) {
			image.composite(rect.png, rect.x, rect.y)
		}
		image.writeAsync(PNG_OUT_PATH).then(() => {
			console.log(`Out: ${PNG_OUT_PATH}`)
		})
	})
})
