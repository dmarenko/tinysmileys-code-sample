// TO DO: rewrite CreateSpeechBubble to return
// canvas that is exactly the size of speech bubble with zero leeway at the bottom and right sides
// i did not consider that the border alignment is in center
// probably want to allow choosing different border alignments, or always do outer border
// and use border alignment to figure out exactly the size the canvas needs to be
// test border 0 (no border, for some reason there is missing border artifact at top left corner with quadraticCurveTo)
// test border 1 (for some reason the top right border often disappears with all the tinkering i tried)
// test border >= 2 (make sure it just works..)
// * measureText always adds leeway space. just have to deal with it. so it will always seem like there is a bit more right padding.
// * rename LeftPadding to PaddingLeft, etc. for consistent naming...

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, yStep: number): { lines: string[], width: number, height: number } => {
	const words = text.split(' ')
	let line = ''
	let width = 0
	const lines = []

	for (let i = 0; i < words.length; i++) {
		let test = words[i]
		let metrics = ctx.measureText(test)
		while (metrics.width > maxWidth) {
			// Determine how much of the word will fit
			test = test.substring(0, test.length - 1)
			metrics = ctx.measureText(test)
		}
		if (words[i] != test) {
			words.splice(i + 1, 0, words[i].substr(test.length))
			words[i] = test
		} 
		test = line + words[i] + ' '
		metrics = ctx.measureText(test)
		if (metrics.width > maxWidth && i > 0) {
			lines.push(line)
			width = Math.max(width, ctx.measureText(line).width)
			line = words[i] + ' '
		} else {
			line = test
		}
	}
	lines.push(line)
	width = Math.max(width, ctx.measureText(line).width)

	return { lines, width, height: lines.length * yStep }
}

type SpeechBubbleOptions = { // deliberately avoiding using css names because otherwise won't be mangled by closure compiler (i.e. font_family instead of fontFamily)
	Text: string;
	TextColor: string;
	FontSize: number;
	FontFamily: string;
	LeftPadding: number;
	RightPadding: number;
	TopPadding: number;
	BottomPadding: number;
	BorderWidth: number;
	BorderColor: string;
	BorderRadius: number;
	TailWidth: number;
	TailHeight: number;
	TailAlign: 0 | 1 | 2;
	BackgroundColor: string;
}

export const CreateSpeechBubble = (options: SpeechBubbleOptions): ImageData => {
	const { Text, FontSize, FontFamily, TextColor, LeftPadding, RightPadding, TopPadding, BottomPadding, BorderColor, BorderWidth, TailWidth, TailHeight, TailAlign, BorderRadius, BackgroundColor } = options

	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')!

	ctx.font = `${FontSize}px ${FontFamily}` // font affects how the text will wrap
	const wrapData = wrapText(ctx, Text, 160, FontSize)
	const lines = wrapData.lines
	const width = wrapData.width + LeftPadding + RightPadding
	const height = wrapData.height + TopPadding + BottomPadding

	// we now know how much space the text occupies, and can draw the bubble.

	canvas.width = BorderWidth * 2 + width
	canvas.height = BorderWidth * 2 + height + TailHeight
	ctx.font = `${FontSize}px ${FontFamily}` // set font again because it was reset after canvas resize
	ctx.textBaseline = 'top' // for convenience, use top left pivot for when we render line by line (instead of bottom left pivot)

	// bubble top left coordinates (border pivot point is center)
	const x = BorderWidth / 2
	const y = BorderWidth / 2

	const endX = x + width // why we dont subtract borderwidth / 2 ??
	const endY = y + height

	ctx.beginPath()
	
	// stroke style
	ctx.strokeStyle = BorderColor
	ctx.lineWidth = BorderWidth

	// partial top left corner
	ctx.moveTo(x + BorderRadius, y)
	// top right corner
	ctx.lineTo(endX - BorderRadius, y)
	ctx.quadraticCurveTo(endX, y, endX, y + BorderRadius)
	// bottom right corner
	ctx.lineTo(endX, y + height - BorderRadius)
	ctx.quadraticCurveTo(endX, endY, endX - BorderRadius, endY)

	// tail
	ctx.lineTo(x + width / 2 + TailWidth / 2, endY)
	if (TailAlign == 1) {
		ctx.lineTo(x + width / 2, endY + TailHeight)
	} else if (TailAlign == 0) {
		ctx.lineTo(x + width / 2 - TailWidth / 2, endY + TailHeight)
	} else if (TailAlign == 2) {
		ctx.lineTo(x + width / 2 + TailWidth / 2, endY + TailHeight)
	}
	ctx.lineTo(x + width / 2 - TailWidth / 2, endY)

	// bottom left corner
	ctx.lineTo(x + BorderRadius, endY)
	ctx.quadraticCurveTo(x, endY, x, endY - BorderRadius)
	// complete top left corner
	ctx.lineTo(x, y + BorderRadius)
	ctx.quadraticCurveTo(x, y, x + BorderRadius, y)

	// finally draw bubble
	ctx.stroke()

	// bubble background color
	ctx.fillStyle = BackgroundColor
	ctx.fill()

	// bubble text color
	ctx.fillStyle = TextColor

	// draw the text on top of the bubble
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		ctx.fillText(line, x + LeftPadding, y + TopPadding + i * FontSize)
	}

	return ctx.getImageData(0, 0, canvas.width, canvas.height)
}