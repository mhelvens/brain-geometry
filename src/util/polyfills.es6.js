////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// extending some core prototypes for convenience                                                                     //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

if (typeof Object.entries !== 'function') {
	Object.defineProperty(Object, 'entries', {
		*value(obj) {
			for (let key of Object.keys(obj)) {
				yield [key, obj[key]];
			}
		}
	});
}

if (typeof Object.values !== 'function') {
	Object.defineProperty(Object, 'values', {
		*value(obj) {
			for (let key of Object.keys(obj)) {
				yield obj[key];
			}
		}
	});
}
