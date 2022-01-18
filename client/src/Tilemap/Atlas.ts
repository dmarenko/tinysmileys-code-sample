import TextureCoordinates from './Types/TextureCoordinates'

export default class Atlas {
	
	public readonly Img: HTMLImageElement
	public readonly TexCoords: Array<TextureCoordinates>
	public readonly BlobUrls: string[]

	constructor(img: HTMLImageElement, texCoords: Array<TextureCoordinates>, blobUrls: string[]) {
		this.Img = img
		this.TexCoords = texCoords
		this.BlobUrls = blobUrls
	}
}