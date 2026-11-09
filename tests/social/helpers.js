export async function withStubs(stubs, run) {
	const originals = stubs.map(([object, name, replacement]) => {
		const original = object[name];
		object[name] = replacement;
		return [object, name, original];
	});

	try {
		return await run();
	} finally {
		for (const [object, name, original] of originals.reverse()) {
			object[name] = original;
		}
	}
}

export function createResponse() {
	return {
		statusCode: 200,
		body: null,
		location: null,
		status(code) { this.statusCode = code; return this; },
		json(body) { this.body = body; return this; },
		redirect(location) { this.location = location; return this; },
	};
}
