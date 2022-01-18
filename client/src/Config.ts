export const DefaultCanvasWidth = 1200
export const DefaultCanvasHeight = 700
export const CameraLag = 1 / 32
export const MinimapFade = 95 / 100 // must be <1
const Physics_MsPerTick = 10
export const Physics = {
	MsPerTick: Physics_MsPerTick,
	Multiplier: 7.752,
	BaseDrag: Math.pow(0.9981, Physics_MsPerTick),
	NotMovingDrag: Math.pow(0.99, Physics_MsPerTick),
	MinVelocity: 0.0001,
	MaxVelocity: 16,
	JumpHeight: 26,
	GravityForce: 2,
	GravityDelay: 2,
	TileSize: 16
}
export const SpeechBubble = {
	LifeDuration: 10,
	FadeSpeed: 1 / 20
}