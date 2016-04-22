export interface Context {}

export interface Parameters {}

export interface Request<PP extends Parameters> {
	context: Context;
	params: PP;
}
