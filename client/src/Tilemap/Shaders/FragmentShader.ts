
export const getFragShader = () => {
	return `
	precision lowp float;
	
	varying vec2 v_texCoord;
	varying float v_alphaReduction;
	uniform sampler2D image;
	
	void main()
	{
		gl_FragColor = texture2D(image, v_texCoord);
		gl_FragColor.a -= v_alphaReduction;
	}
	`
}