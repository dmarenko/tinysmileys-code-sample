import { opacityAnimationDurationToRate } from './Shaders/VertexShader';
import Chunk from './Chunk'
import App from './App'
import Sprite from './Sprite'
import { GL, FLOAT32ARRAY } from './Types/Constants'
import TextureCoordinates from './Types/TextureCoordinates'

const CHUNK_WIDTH = 16
const CHUNK_HEIGHT = 16

export default class LayerRenderer {
	private readonly App: App
	public readonly IsTextLayer: boolean
	private Map: Uint16Array
	private Width: number
	private Height: number
	private readonly XCount: number
	private readonly YCount: number
	private readonly Chunks: Array<Array<Chunk>>
	private readonly ChunkWidth: number
	private readonly ChunkHeight: number
	private readonly Sprites: Sprite[] = []
	
	constructor(app: App, map: Uint16Array, mapWidth: number, mapHeight: number, isTextLayer: boolean = false) {
		this.App = app
		this.Map = map
		this.Width = mapWidth
		this.Height = mapHeight

		this.IsTextLayer = isTextLayer

		this.ChunkWidth = Math.min(CHUNK_WIDTH, mapWidth)
		this.ChunkHeight = Math.min(CHUNK_HEIGHT, mapHeight)

		this.XCount = Math.ceil(mapWidth / this.ChunkWidth) // chunks count horizontally
		this.YCount = Math.ceil(mapHeight / this.ChunkHeight) // chunks count vertically

		this.Chunks = new Array(this.YCount)
		for (let y = 0; y < this.Chunks.length; y++) {
			this.Chunks[y] = new Array(this.XCount)
		}

		for (let ty = 0, y = 0; ty < mapHeight; ty += this.ChunkHeight, y++) {
			for (let tx = 0, x = 0; tx < mapWidth; tx += this.ChunkWidth, x++) {
				let chunkWidth = this.ChunkWidth
				let chunkHeight = this.ChunkHeight
				// trim chunks that are last in a row or column
				if (tx + this.ChunkWidth > mapWidth) {
					chunkWidth = mapWidth - tx
				}
				if (ty + this.ChunkHeight > mapHeight) {
					chunkHeight = mapHeight - ty
				}
				const vertices = new Float32Array(chunkWidth * chunkHeight * 11 * FLOAT32ARRAY.BYTES_PER_ELEMENT)
				const indices = new Uint16Array(chunkWidth * chunkHeight * 6)

				const startX = tx
				const startY = ty
				const endX = tx + chunkWidth - 1
				const endY = ty + chunkHeight - 1

				this.Chunks[y][x] = new Chunk(app.GL, startX, startY, endX, endY, vertices, indices)
				
			}
		}

	}

	AddSprite(sprite: Sprite) {
		this.Sprites.push(sprite)
	}

	RemoveSprite(sprite: Sprite) {
		this.Sprites.splice(this.Sprites.indexOf(sprite), 1)
	}

	Tick() {
		for (const sprite of this.Sprites) {
			sprite.Tick()
		}
	}

	SetChunkOfTileAsDirty(x: number, y: number) {
		const chunkX = Math.floor(x / this.ChunkWidth)
		const chunkY = Math.floor(y / this.ChunkHeight)
		const chunk = this.Chunks[chunkY][chunkX]

		chunk.VerticesDirty = true
	}

	SetAllChunksAsDirty() {
		for (let y = 0; y < this.Chunks.length; y++) {
			for (let x = 0; x < this.Chunks[0].length; x++) {
				this.Chunks[y][x].VerticesDirty = true
			}
		}
	}

	Render(x: number, y: number) {
		const width = this.App.Canvas.width
		const height = this.App.Canvas.height
		const xTiles = this.ChunkWidth * this.App.TileSize
		const yTiles = this.ChunkHeight * this.App.TileSize
		const startX = Math.max(Math.floor(x / xTiles), 0)
		const startY = Math.max(Math.floor(y / yTiles), 0)
		const endX = Math.min(Math.floor(Math.ceil(x + width - 1) / xTiles), this.XCount - 1)
		const endY = Math.min(Math.floor(Math.ceil(y + height - 1) / yTiles), this.YCount - 1)

		const gl = this.App.GL
		const tileSize = this.App.TileSize

		for (let cy = startY; cy <= endY; cy++) {
			for (let cx = startX; cx <= endX; cx++) {
				const chunk = this.Chunks[cy][cx]

				gl.bindBuffer(GL.ARRAY_BUFFER, chunk.VertexBuffer)
				
				if (chunk.VerticesDirty) {
					const vertices = chunk.Vertices
					let i = 0
					for (let ty = chunk.StartY; ty <= chunk.EndY; ty++) {
						for (let tx = chunk.StartX; tx <= chunk.EndX; tx++) {

							let x = tx * tileSize
							let y = ty * tileSize
							const diag = x + y
							const tileId = this.GetTile(tx, ty)
							let coords: TextureCoordinates

							if (!this.IsTextLayer) { // normal layer
								coords = this.App.GetTileHandler(tileId).GetTexture(tx, ty, tileId)
								
								vertices[i++] = x
								vertices[i++] = y
								vertices[i++] = coords.X1
								vertices[i++] = coords.Y1
								vertices[i++] = diag;
								vertices[i++] = coords.NumOfFrames
								vertices[i++] = coords.FramesPerRow
								vertices[i++] = coords.FrameWidth
								vertices[i++] = coords.FrameHeight
								i++
								i++
								
								vertices[i++] = x
								vertices[i++] = y + tileSize
								vertices[i++] = coords.X1
								vertices[i++] = coords.Y2
								vertices[i++] = diag
								vertices[i++] = coords.NumOfFrames
								vertices[i++] = coords.FramesPerRow
								vertices[i++] = coords.FrameWidth
								vertices[i++] = coords.FrameHeight
								i++
								i++
								
								vertices[i++] = x + tileSize
								vertices[i++] = y + tileSize
								vertices[i++] = coords.X2
								vertices[i++] = coords.Y2
								vertices[i++] = diag
								vertices[i++] = coords.NumOfFrames
								vertices[i++] = coords.FramesPerRow
								vertices[i++] = coords.FrameWidth
								vertices[i++] = coords.FrameHeight
								i++
								i++
								
								vertices[i++] = x + tileSize
								vertices[i++] = y
								vertices[i++] = coords.X2
								vertices[i++] = coords.Y1
								vertices[i++] = diag
								vertices[i++] = coords.NumOfFrames
								vertices[i++] = coords.FramesPerRow
								vertices[i++] = coords.FrameWidth
								vertices[i++] = coords.FrameHeight
								i++
								i++
							} else {
								coords = this.App.NumAtlas.TexCoords[tileId]
								const w = (coords.X2 - coords.X1) * this.App.NumAtlas.Img.width
								const h = (coords.Y2 - coords.Y1) * this.App.NumAtlas.Img.height
								
								x += (tileSize - w)
								y += (tileSize - h)
								
								vertices[i++] = x;						vertices[i++] = y
								vertices[i++] = coords.X1;				vertices[i++] = coords.Y1
								vertices[i++] = 0;						vertices[i++] = 1
								i++;									i++
								
								vertices[i++] = x;						vertices[i++] = y + h
								vertices[i++] = coords.X1;				vertices[i++] = coords.Y2
								vertices[i++] = 0;						vertices[i++] = 1
								i++;									i++
								
								vertices[i++] = x + w;					vertices[i++] = y + h
								vertices[i++] = coords.X2;				vertices[i++] = coords.Y2
								vertices[i++] = 0;						vertices[i++] = 1
								i++;									i++
								
								vertices[i++] = x + w;					vertices[i++] = y
								vertices[i++] = coords.X2;				vertices[i++] = coords.Y1
								vertices[i++] = 0;						vertices[i++] = 1
								i++;									i++
							}

						} // for
					} // for

					gl.bufferData(GL.ARRAY_BUFFER, vertices, GL.STATIC_DRAW)

					chunk.VerticesDirty = false
				} // if dirty

				gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, chunk.IndexBuffer)

				if (chunk.IndicesDirty) {
					const indices = chunk.Indices
					let j = 0
					let vertexOffset = 0
					for (let ty = chunk.StartY; ty <= chunk.EndY; ty++) {
						for (let tx = chunk.StartX; tx <= chunk.EndX; tx++) {

							indices[j++] = vertexOffset + 0
							indices[j++] = vertexOffset + 1
							indices[j++] = vertexOffset + 2
						
							indices[j++] = vertexOffset + 3
							indices[j++] = vertexOffset + 2
							indices[j++] = vertexOffset + 0

							vertexOffset += 4
						}
					}

					// upload indices
					gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.STATIC_DRAW)

					chunk.IndicesDirty = false
				} // dirty
				
				gl.vertexAttribPointer(this.App.PositionAttributeLocation, 2, GL.FLOAT, false, 11 * FLOAT32ARRAY.BYTES_PER_ELEMENT, 0)
				gl.vertexAttribPointer(this.App.TexCoordAttributeLocation, 2, GL.FLOAT, false, 11 * FLOAT32ARRAY.BYTES_PER_ELEMENT, 2 * FLOAT32ARRAY.BYTES_PER_ELEMENT)
				gl.vertexAttribPointer(this.App.AnimationAttributeLocation, 3, GL.FLOAT, false, 11 * FLOAT32ARRAY.BYTES_PER_ELEMENT, 4 * FLOAT32ARRAY.BYTES_PER_ELEMENT)
				gl.vertexAttribPointer(this.App.TexSizeAttributeLocation, 2, GL.FLOAT, false, 11 * FLOAT32ARRAY.BYTES_PER_ELEMENT, 7 * FLOAT32ARRAY.BYTES_PER_ELEMENT)
				gl.vertexAttribPointer(this.App.OpacityAnimationAttributeLocation, 2, GL.FLOAT, false, 11 * FLOAT32ARRAY.BYTES_PER_ELEMENT, 9 * FLOAT32ARRAY.BYTES_PER_ELEMENT)

				// render
				gl.drawElements(GL.TRIANGLES, chunk.Indices.length, GL.UNSIGNED_SHORT, 0)
			}
		}
		
		for (const sprite of this.Sprites) {
			sprite.Render()
		}
	}

	SetOpacityAnimation(x: number, y: number, duration: number) {
		const chunkX = Math.floor(x / this.ChunkWidth)
		const chunkY = Math.floor(y / this.ChunkHeight)
		const chunk = this.Chunks[chunkY][chunkX]
		const tileX = x % chunk.Width
		const tileY = y % chunk.Height
		const vertices = chunk.Vertices
		
		let i = (tileY * chunk.Width + tileX) * (FLOAT32ARRAY.BYTES_PER_ELEMENT * 11)

		const startTime = this.App.Time
		const rate = opacityAnimationDurationToRate(duration)
		
		i++; i++
		i++; i++
		i++; i++; i++
		i++; i++
		vertices[i++] = startTime; vertices[i++] = rate
		
		i++; i++
		i++; i++
		i++; i++; i++
		i++; i++
		vertices[i++] = startTime; vertices[i++] = rate
		
		i++; i++
		i++; i++
		i++; i++; i++
		i++; i++
		vertices[i++] = startTime; vertices[i++] = rate
		
		i++; i++
		i++; i++
		i++; i++; i++
		i++; i++
		vertices[i++] = startTime; vertices[i++] = rate

		chunk.VerticesDirty = true

	}

	SetMap(map: Uint16Array) {
		this.Map = map
		this.SetAllChunksAsDirty()
	}

	SetTile(x: number, y: number, tileId: number) {
		if (x >= 0 && x < this.Width && y >= 0 && y < this.Height) {
			const idx = x + y * this.Width
			if (this.Map[idx] != tileId) {
				this.Map[idx] = tileId
				this.SetChunkOfTileAsDirty(x, y)
				return true
			}
		}
		return false
	}

	GetTile(x: number, y: number) {
		if (x >= 0 && x < this.Width && y >= 0 && y < this.Height) {
			return this.Map[x + y * this.Width]
		}
		return -1
	}

	Destroy() {
		for (let y = 0; y < this.Chunks.length; y++) {
			for (let x = 0; x < this.Chunks[0].length; x++) {
				this.Chunks[y][x].Destroy()
			}
		}
		for (const sprite of this.Sprites) {
			sprite.Destroy(true)
		}
	}

	GetMapReference() {
		return this.Map
	}
}