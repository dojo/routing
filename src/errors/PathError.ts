export default class PathError implements Error {
	message: string;

	get name(): string {
		return 'PathError';
	}

	constructor(message: string = '') {
		this.message = message;
	}
}
