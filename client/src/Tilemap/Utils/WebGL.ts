// note: use devicepixelratio? https://webgl2fundamentals.org/webgl/resources/webgl-utils.js
// use TWGL?

import { GL } from '../Types/Constants'

export const CompileShader = (gl: WebGLRenderingContext, shaderSource: string, shaderType: GLenum): WebGLShader => {
	const shader = gl.createShader(shaderType)
	if (shader == null) {
		throw `Failed to create shader of type ${shaderType}`
	}
	gl.shaderSource(shader, shaderSource)
	gl.compileShader(shader)
	const success = gl.getShaderParameter(shader, GL.COMPILE_STATUS)
	if (!success) {
		throw 'Failed to compile shader: ' + gl.getShaderInfoLog(shader)
	}
	return shader
}

export const CreateProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram => {
	const program = gl.createProgram()
	if (program == null) {
		throw 'Failed to create program'
	}
	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)
	gl.linkProgram(program)
	const success = gl.getProgramParameter(program, GL.LINK_STATUS)
	if (!success) {
		throw 'Failed to link program: ' + gl.getProgramInfoLog(program)
	}
	return program
}
