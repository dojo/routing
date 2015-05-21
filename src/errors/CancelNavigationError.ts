export default class CancelNavigationError implements Error {
	message: string;

	get name(): string {
		return 'CancelNavigationError';
	}

	constructor(message: string = '') {
		this.message = message;
	}
}
