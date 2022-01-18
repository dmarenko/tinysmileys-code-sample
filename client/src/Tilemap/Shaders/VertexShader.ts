
/*	
	a_animation = (frameOffset, frameCount, framesPerRow)

	a_texSize = (frameWidth, frameHeight)

	v_opacityAnimation = (startTime, opacityReductionPerMillisecond)

 */

export const opacityAnimationDurationToRate = (duration: number) => {
	if (duration == Infinity) {
		return 0
	} else if (duration == 0) {
		return 1
	} else {
		return 1 / duration
	}
}

export const getVertexShader = (textureWidth: number, textureHeight: number) => {
	const animationSpeedFactor = 40
	const src = `
		precision lowp float;
		uniform vec2 u_resolution;
		uniform vec2 u_translation;
		uniform float u_time;
		attribute vec2 a_position;
		attribute vec2 a_texCoord;
		attribute vec3 a_animation;
		attribute vec2 a_texSize;
		attribute vec2 a_opacityAnimation;
		varying vec2 v_texCoord;
		varying float v_alphaReduction;

		float modI(float a, float b) {
			float m = a - floor((a + 0.5) / b) * b;
			return floor(m + 0.5);
		}

		void main() {
			v_alphaReduction = (u_time - a_opacityAnimation.x) * a_opacityAnimation.y;
			v_texCoord = a_texCoord;
			// animation
			float frameOffset = a_animation.x;
			float frameCount = a_animation.y;
			float framesPerRow = a_animation.z;
			float frameWidth = a_texSize.x;
			float frameHeight = a_texSize.y;
			float frame = modI(floor(u_time / ${animationSpeedFactor}.0) + frameOffset, frameCount);
			v_texCoord.x += modI(frame, framesPerRow) * frameWidth;
			v_texCoord.y += floor(frame / framesPerRow) * frameHeight;
			vec2 pos = ((a_position + u_translation) / u_resolution) * 2.0;
			gl_Position = vec4(pos.x - 1.0, 1.0 - pos.y, 0.0, 1.0);
		}
	`
	return src
}
