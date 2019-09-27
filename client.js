/// <reference path="../../../citizen/scripting/v8/index.d.ts"/>
/// <reference path="../../../citizen/scripting/v8/natives_universal.d.ts"/>

// If you change order of an enum, update the second one to correspond too
// These 2 enums are for evidences types, 3D Text & Notification when you take them
const EvidenceTypes = {
	"BULLET": 0,
	"BLOOD": 1,
	"MAGAZINE": 2,
}

const EvidenceNames = {
	0: "~o~%sx Bullet",
	1: "~r~Blood",
	2: "~y~%sx Magazine",
}

let EvidencesList = [];

function generateRandomNumber(min, max) {
	return Math.random() * (max - min) + min;
};

function getRandomPosAround(posX, posY, posZ = null, rangeX = 2.0, rangeY = 2.0, rangeZ = 0.5) {
	let newPos = [];

	newPos.push(posX + generateRandomNumber(-rangeX/2, rangeX/2));
	newPos.push(posY + generateRandomNumber(-rangeY/2, rangeY/2));
	if (posZ != null)
		newPos.push(posZ + generateRandomNumber(-rangeZ/2, rangeZ/2));

	return newPos;
}

let pedPos = GetEntityCoords(PlayerPedId());
let pedWeapon = GetSelectedPedWeapon(PlayerPedId());

setInterval(() => {
	const ped = PlayerPedId();
	pedPos = GetEntityCoords(ped);
	pedWeapon = GetSelectedPedWeapon(ped);
}, 250);

function getEvidenceOfTypeNear(evidenceType, pos) {
	for (let i = 0; i < EvidencesList.length; i++) {
		const ev = EvidencesList[i];
		if (ev.type != evidenceType)
			continue;
		if (getDistance(pos, ev.pos) <= .5)
			return ev;
	}
	return null;
}

function getClosestEvidence(pos) {

	let closest = null;
	let closestPos = null;

	for (let i = 0; i < EvidencesList.length; i++) {
		const ev = EvidencesList[i];
		let dist = getDistance(ev.pos, pos);
		if (closest == null) {
			closest = ev;
			closestPos = dist;
			continue;
		}
		if (dist < closestPos) {
			closest = ev;
			closestPos = dist;
		}
	}
	return [closest, closestPos];
}

setInterval(() => {
	const ped = PlayerPedId();
	if (IsPedShooting(ped)) {
		const weapon = pedWeapon;
		if (NoBulletsWeapons.indexOf(weapon) == -1) {
			let pos = pedPos;
			pos[2] -= 1.0;

			const cartridgePosition = getRandomPosAround(pos[0], pos[1]);

			const finalPos = [cartridgePosition[0], cartridgePosition[1], pos[2]];

			let evidence = getEvidenceOfTypeNear(EvidenceTypes.BULLET, finalPos);
			if (evidence == null) {
				evidence = {
					type: EvidenceTypes.BULLET,
					pos: finalPos,
					weaponHash: weapon,
					amount: 1
				};
				// EvidencesList.push(evidence);
				emitNet('evidences:newEvidence', evidence);
			} else {
				const newEv = evidence;
				newEv.amount++;
				emitNet('evidences:updateEvidence', newEv);
			}
		}
	}
}, 5);

async function RqtModel(model) {
	return new Promise((resolve) => {
		RequestModel(model);
		let inter = setInterval(() => {
			if (HasModelLoaded(model)) {
				resolve(true);
				clearInterval(inter);
				return;
			}
		}, 5);
	});
}

// Melee, Stungun, RPG ...
const NoReloadCheck = [
	0x92A27487,
	0x958A4A8F,
	0xF9E6AA4B,
	0x84BD7BFD,
	0xA2719263,
	0x8BB05FD7,
	0x440E4788,
	0x4E875F73,
	0xF9DCBF2D,
	0xD8DF3C3C,
	0x99B507EA,
	0xDD5DF8D9,
	0xDFE37640,
	0x678B81B1,
	0x19044EE0,
	0xCD274149,
	0x94117305,
	0x3813FC08,
	0x3656C8C1,
	0xAF3696A1,
	0x476BF155,
	0xA89CB99E, // Musket
	0x47757124,
	0x42BF8A85,
	0x7F7497E5,
	0xB1CA77B1,
	0x6D544C99,
	0x63AB0442,
	0xB62D1F67,
	0x93E220BD,
	0xA0973D5E,
	0x24B17070,
	0x2C3731D9,
	0xAB564B93,
	0x787F0BB,
	0xBA45E8B8,
	0x23C9F95C,
	0xFDBC8A50,
	0x497FACC3,
	0x34A67B97,
	0x060EC506
];

let wasReloading = false;
let ammountOfBullets = 0;
setInterval(() => {
	const ped = PlayerPedId();
	if (NoReloadCheck.indexOf(pedWeapon) != -1)
		return;
	const IsReloading = GetIsTaskActive(ped, 298);
	if (!wasReloading && IsReloading) {
		wasReloading = true;
		[_, ammountOfBullets] = GetAmmoInClip(ped, pedWeapon, GetPedAmmoType(pedWeapon));
	} else if (wasReloading && !IsReloading) {
		wasReloading = false;

		let pos = pedPos;
		pos[2] -= 1.0;

		const magPosition = getRandomPosAround(pos[0], pos[1]);

		const finalPos = [magPosition[0], magPosition[1], pos[2]];
		evidence = {
			type: EvidenceTypes.MAGAZINE,
			pos: finalPos,
			weaponHash: pedWeapon,
			amount: 1,
			remainingBullets: ammountOfBullets,
		};
		ammountOfBullets = 0;
		// EvidencesList.push(evidence);
		emitNet('evidences:newEvidence', evidence);
	}
}, 500);

function getDistance(posA, posB) {
	return Math.sqrt(
		Math.pow(posB[0] - posA[0], 2) +
		Math.pow(posB[1] - posA[1], 2) +
		Math.pow(posB[2] - posA[2], 2)
	);
}

function drawText3D(pos, text, size) {
	const [onScreen, x, y] = World3dToScreen2d(pos[0], pos[1], pos[2]);
	const camCoords = GetGameplayCamCoord();
	const dist = getDistance(camCoords, pos);

	let scale = (size / dist) * 2;
	const fov = (1 / GetGameplayCamFov()) * 100;
	scale *= fov;

	if (onScreen) {
		SetTextScale(0, 0.55 * scale);
		SetTextFont(0);
		SetTextColour(255, 255, 255, 255);
		SetTextDropshadow(0, 0, 0, 0, 255);
		SetTextDropShadow();
		SetTextOutline();
		SetTextEntry('STRING');
		SetTextCentre(1);
		AddTextComponentString(text);
		DrawText(x, y);
	}
}

function ShowNotification(message) {
	SetNotificationTextEntry('STRING');
	AddTextComponentSubstringPlayerName(message);
	DrawNotification(false, true);
}

setTick(() => {
	const pPos = pedPos;

	let drawed = 0;
	for (let i = 0; i < EvidencesList.length; i++) {
		const ev = EvidencesList[i];
		if (drawed >= 8)
			break;
		const dist = getDistance(pPos, ev.pos);

		if (dist > 1.5)
			continue;
		const drawPos = [ev.pos[0], ev.pos[1], ev.pos[2] + .05];

		drawText3D(drawPos, `${EvidenceNames[ev.type].replace('%s', ev.amount)}`, .5);
		drawed++;
	}

	if (drawed > 0) {
		if (IsControlJustPressed(0, 38)) {
			const [ev, dist] = getClosestEvidence(pPos);
			if (ev != null && dist <= 1.5) {
				TaskStartScenarioInPlace(PlayerPedId(), "CODE_HUMAN_MEDIC_TEND_TO_DEAD", 0, true);
				setTimeout(() => {
					ClearPedTasks(PlayerPedId());
					ShowNotification(`You took ${EvidenceNames[ev.type].replace('%s', ev.amount)}`);
					if (ev.type == EvidenceTypes.BULLET) {
						ShowNotification(`Bullet of ${ev.weaponHash}`);
					} else if (ev.type == EvidenceTypes.MAGAZINE) {
						ShowNotification(`Magazine of ${ev.weaponHash} with ${ev.remainingBullets} bullets still inside`);
					} else if (ev.type == EvidenceTypes.BLOOD) {
						ShowNotification(`DNA Check match with Citizen ${ev.owner}`);
					}
					const index = EvidencesList.indexOf(ev);
					EvidencesList.splice(index, 1);
				}, 1500);
			}
		}
	}
});

// Melee, Lasers Weapons, Snowball ...
const NoBulletsWeapons = [
	0x92A27487,
	0x958A4A8F,
	0xF9E6AA4B,
	0x84BD7BFD,
	0xA2719263,
	0x8BB05FD7,
	0x440E4788,
	0x4E875F73,
	0xF9DCBF2D,
	0xD8DF3C3C,
	0x99B507EA,
	0xDD5DF8D9,
	0xDFE37640,
	0x678B81B1,
	0x19044EE0,
	0xCD274149,
	0x94117305,
	0x3813FC08,
	0x3656C8C1,
	0xAF3696A1,
	0x476BF155,
	0x47757124, // Flare Gun
	0x42BF8A85,
	0x7F7497E5,
	0xB1CA77B1,
	0x6D544C99,
	0x63AB0442,
	0xB62D1F67,
	0x93E220BD,
	0xA0973D5E,
	0x24B17070,
	0x2C3731D9,
	0xAB564B93,
	0x787F0BB,
	0xBA45E8B8,
	0x23C9F95C,
	0xFDBC8A50,
	0x497FACC3,
	0x34A67B97,
	0x060EC506
];

// Explosions, Fire, Fire Extinguisher ...
const NoBloodWeaponsHash = [
	2460120199,
	2508868239,
	4192643659,
	2227010557,
	2725352035,
	2343591895,
	1141786504,
	1317494643,
	4191993645,
	3638508604,
	2578778090,
	3713923289,
	3756226112,
	1737195953,
	419712736,
	3441901897,
	2484171525,
	911657153,
	1198879012,
	2939590305,
	2982836145,
	2726580491,
	1305664598,
	1119849093,
	2138347493,
	1834241177,
	1672152130,
	125959754,
	3056410471,
	2481070269,
	2694266206,
	4256991824,
	1233104067,
	615608432,
	741814745,
	2874559379,
	126349499,
	3125143736,
	883325847,
	101631238,
	4222310262,
	2461879995,
	3425972830,
	// 3452007600,
	4194021054,
	324506233,
	4284007675,
	1936677264,
	539292904,
	910830060,
	3750660587,
	341774354,
	1945616459,
	1741783703,
];

on('gameEventTriggered', (name, ...args)=> {
	if (name == 'CEventNetworkEntityDamage') {
		/**
		 * args[0] = Array:
			* 0 = DamagedEntity
			* 1 = DamagedByEntity
			* 2 = ?
			* 3 = ?
			* 4 = Weapon
			* 5 = ?
			* 6 = ?
			* 7 = ?
			* 8 = ?
			* 9 = ?
			* 10 = ?
		 */
		if (args[0][0] == PlayerPedId() && NoBloodWeaponsHash.indexOf(args[0][4]) == -1) {
			let pos = pedPos;
			pos[2] -= 1.0;

			evidence = {
				type: EvidenceTypes.BLOOD,
				pos: pos,
				owner: GetPlayerServerId(PlayerId())
			};
			emitNet('evidences:newEvidence', evidence, 720000); // 12 Minutes Life Duration for blood evidence (Based on default GTA V Time Scale where 24 Hours IG = 24 minutes IRL)
		}
	}
});

function getById(id) {
	for (let i = 0; i < EvidencesList.length; i++) {
		if (EvidencesList[i].id == id)
			return [EvidencesList[i], i];
	}
}

onNet('evidences:getList', (datas) => {
	EvidencesList = datas;
});

onNet('evidences:new', (evidence) => {
	EvidencesList.push(evidence);
});

onNet('evidences:update', (evidence) => {
	const [ev, key] = getById(evidence.id);
	if (ev != null) {
		EvidencesList.splice(key, 1);
		EvidencesList.push(evidence);
	}
});

onNet('evidences:remove', (id) => {
	const [ev, key] = getById(id);
	if (ev != null) {
		EvidencesList.splice(key, 1);
	}
});