let Evidences = [];

onNet('harcap:playerReady', () => {
	const player = global.source;

	emitNet('evidences:getList', player, Evidences);
});

function getNextId() {
	let actual = 0;
	Evidences.forEach((ev) => {
		if (ev.id >= actual)
			actual = ev.id + 1;
	});
	if (actual >= Number.MAX_VALUE)
		actual = 0;
	return actual;
}

function getById(id) {
	for (let i = 0; i < Evidences.length; i++) {
		if (Evidences[i].id == id)
			return [Evidences[i], i];
	}
	return [null, null];
}

onNet('evidences:newEvidence', (evidence, lifeDuration = null) => {
	evidence.id = getNextId();
	if (lifeDuration != null) {
		evidence.delete = setTimeout(() => {
			console.log("Deleting");
			emit('evidences:removeEvidence', evidence.id);
		}, lifeDuration);
	}
	Evidences.push(evidence);
	emitNet('evidences:new', -1, evidence);
});

onNet('evidences:updateEvidence', (evidence) => {
	if (evidence.id != null) {
		const [ev, key] = getById(evidence.id);
		if (ev != null) {
			Evidences.splice(key, 1);
			Evidences.push(evidence);
			emitNet('evidences:update', -1, evidence);
		}
	}
});

onNet('evidences:removeEvidence', (id) => {
	const [ev, key] = getById(id);
	if (ev != null) {
		if (ev.delete != undefined) {
			clearTimeout(ev.delete);
		}
		Evidences.splice(key, 1);
		emitNet('evidences:delete', -1, id);
	}
});