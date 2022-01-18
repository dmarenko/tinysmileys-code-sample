export const SmoothPath = (x1: number, y1: number, x2: number, y2: number, maxDistance: number): Uint32Array => {
	const xabs = Math.abs(x1 - x2)
	const yabs = Math.abs(y1 - y2)
	const xdiff = x2 - x1
	const ydiff = y2 - y1

	const length = Math.sqrt((Math.pow(xabs, 2) + Math.pow(yabs, 2)))
	const steps = length / maxDistance
	const xstep = xdiff / steps
	const ystep = ydiff / steps

	const result = new Uint32Array(Math.ceil(steps) * 2 + 2)
	let k = 0
	result[k++] = x1
	result[k++] = y1

	for (let s = 0; s < steps; s++) {
		result[k++] = x1 + (xstep * s)
		result[k++] = y1 + (ystep * s)
	}

	return result
}