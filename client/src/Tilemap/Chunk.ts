import { GL } from './Types/Constants'

export default class Chunk {
	private GL: WebGLRenderingContext

	public VerticesDirty: boolean = true
	public IndicesDirty: boolean = true

	public readonly VertexBuffer: WebGLBuffer
	public readonly IndexBuffer: WebGLBuffer
	
	public Vertices: Float32Array
	public Indices: Uint16Array

	public readonly StartX: number
	public readonly StartY: number
	public readonly EndX: number
	public readonly EndY: number

	public readonly Width: number
	public readonly Height: number

	constructor(gl: WebGLRenderingContext, startX: number, startY: number, endX: number, endY: number, vertices: Float32Array, indices: Uint16Array) {
		this.GL = gl
		this.StartX = startX
		this.StartY = startY
		this.EndX = endX
		this.EndY = endY
		this.Width = endX - startX + 1
		this.Height = endY - startY + 1
		this.Vertices = vertices
		this.Indices = indices
		this.VertexBuffer = gl.createBuffer()!
		this.IndexBuffer = gl.createBuffer()!
	}

	Destroy() {
		this.GL.deleteBuffer(this.VertexBuffer)
		this.GL.deleteBuffer(this.IndexBuffer)
	}
}
