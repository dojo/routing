export default class MissingRouteError implements Error {
	message: string;

	get name(): string {
		return 'MissingRouteError';
	}

	constructor(message: string = '') {
		this.message = message;
	}
}
